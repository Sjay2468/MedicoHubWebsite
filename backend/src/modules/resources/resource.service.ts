import { Resource } from '../../models/Resource';
import { ResourceDocument } from '../../types/firestore-v3';
import { extractTextFromPDF, extractTextFromYouTube } from '../../utils/textExtractor';
import { LRUCache } from 'lru-cache';

// Database Optimization: Offload text storage to in-memory cache
const contextCache = new LRUCache<string, string>({
    max: 50,
    ttl: 1000 * 60 * 60,
    allowStale: false,
});

// Lazy load DB internally to avoid circular dependency issues
let dbInstance: any = null;
const getDb = () => {
    if (!dbInstance) {
        try {
            // Using a safe relative path for the compiled JS environment
            dbInstance = require('../../config/firebase').db;
        } catch (e) {
            console.error("[ResourceService] DB Init Failed:", e);
        }
    }
    return dbInstance;
};

export class ResourceService {
    /**
     * Fetch resources tailored to a user's profile.
     */
    static async getResourcesForUser(userProfile: any) {
        const allResourcesRaw = await Resource.find().sort({ createdAt: -1 }).lean();

        const allResources = allResourcesRaw.map(r => ({
            ...r,
            id: r._id.toString()
        })) as unknown as ResourceDocument[];

        const userYear = (userProfile.year || userProfile.academicYear || 'General').toString().toLowerCase();
        const isMcamp = userProfile.mcamp?.isEnrolled || userProfile.mcampId || false;

        // 1. Build Curriculum Map if user is suspended (to enforce frozen-in-time rule)
        const curriculumMap: Record<string, number> = {};
        let suspensionDay = 999;

        if (isMcamp && userProfile.mcamp?.isSuspended && userProfile.mcamp?.startDate && userProfile.mcamp?.suspensionDate) {
            try {
                const db = getDb();
                if (!db) throw new Error("Database instance unavailable");
                const snap = await db.collection('mcamp').doc('curriculum').get();
                if (snap.exists) {
                    const weeks = snap.data().weeks || [];
                    weeks.forEach((w: any) => {
                        Object.entries(w.days || {}).forEach(([dayId, ids]: [any, any]) => {
                            const day = (Number(w.id) - 1) * 7 + Number(dayId);
                            ids.forEach((id: string) => {
                                if (!curriculumMap[id] || day < curriculumMap[id]) curriculumMap[id] = day;
                            });
                        });
                    });
                }
                const start = new Date(userProfile.mcamp.startDate);
                const suspension = new Date(userProfile.mcamp.suspensionDate);
                suspensionDay = Math.ceil(Math.abs(suspension.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            } catch (e) {
                console.error("Suspension map build failed", e);
            }
        }

        return allResources.filter((res: ResourceDocument) => {
            const resYear = (res.year || '').toLowerCase();
            const resTags = (res.tags || []).map(t => t.toLowerCase());

            // 1. MCAMP Logic: Permanent access if enrolled, but frozen if suspended
            const isMcampResource = res.isMcampExclusive || resTags.includes('mcamp');
            if (isMcamp && isMcampResource) {
                if (userProfile.mcamp?.isSuspended) {
                    // Check curriculum day
                    const unlockDay = curriculumMap[res.id];
                    if (unlockDay && unlockDay > suspensionDay) return false;

                    // Check quiz week
                    if (res.type === 'Quiz' && (res as any).weekNumber) {
                        const quizUnlockDay = (Number((res as any).weekNumber) - 1) * 7 + 1;
                        if (quizUnlockDay > suspensionDay) return false;
                    }
                }
                return true;
            }

            if (res.isMcampExclusive && !isMcamp) {
                return false;
            }

            // 2. Year Matching Logic
            const isGeneral = !resYear || resYear === 'general' || resYear === '' || resTags.includes('general');
            if (isGeneral) return true;

            // Robust matching: Check if normalized levels match (e.g. "Year 2" vs "200L")
            const getLevel = (s: string) => {
                const n = s.match(/\d+/);
                return n ? n[0] : s;
            };
            const userLvl = getLevel(userYear);
            const resLvl = getLevel(resYear);

            const isMatch = resYear === userYear ||
                userYear.includes(resYear) ||
                resYear.includes(userYear) ||
                userLvl === resLvl ||
                resTags.includes(userYear) ||
                resTags.some(tag => userYear.includes(tag) || tag.includes(userYear));

            return isMatch;
        });
    }

    /**
     * Fetch ALL resources for the admin panel.
     */
    static async getAllResources() {
        const results = await Resource.find().sort({ createdAt: -1 }).lean();
        return results.map(r => ({
            ...r,
            id: r._id.toString()
        }));
    }

    static async createResource(data: any) {
        const resource = new Resource(data);
        const result = await resource.save();
        return {
            ...result.toObject(),
            id: result._id.toString()
        };
    }

    static async updateResource(id: string, data: any) {
        const result = await Resource.findByIdAndUpdate(id, data, { new: true }).lean();
        if (!result) return null;
        if (contextCache.has(id)) contextCache.delete(id);
        return {
            ...result,
            id: (result as any)._id.toString()
        };
    }

    static async deleteResource(id: string) {
        await Resource.findByIdAndDelete(id);
        if (contextCache.has(id)) contextCache.delete(id);
        return { success: true };
    }

    static async getResourceContext(id: string) {
        if (contextCache.has(id)) {
            return {
                id,
                extractedText: contextCache.get(id)
            };
        }

        const resource = await Resource.findById(id).select('+extractedText').lean();
        if (!resource) return null;

        let text = (resource as any).extractedText || "";

        if (!text && resource.url) {
            try {
                if (resource.type === 'PDF' || resource.url.endsWith('.pdf')) {
                    text = await extractTextFromPDF(resource.url);
                } else if (resource.type === 'Video' || (resource.url.includes('youtube'))) {
                    text = await extractTextFromYouTube(resource.url);
                }
            } catch (error) {
                console.error(`[Extraction Error] Failed to extract from ${id}`, error);
                text = "Context unavailable for this resource.";
            }
        }

        if (text && text.length > 50) {
            contextCache.set(id, text);
        }

        return {
            id: resource._id.toString(),
            extractedText: text
        };
    }
}
