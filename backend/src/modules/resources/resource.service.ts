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

        // MCAMP Profile Info
        const mcamp = userProfile.mcamp || {};
        const isMcampMember = !!(mcamp.isEnrolled || mcamp.cohortId || userProfile.mcampId);
        const isSuspended = !!mcamp.isSuspended;
        const suspensionDate = mcamp.suspensionDate;
        const startDate = mcamp.startDate;

        let allowedMcampIds = new Set<string>();

        // 1. Resolve MCAMP Allowed Resource IDs if member
        if (isMcampMember) {
            if (isSuspended && suspensionDate && startDate) {
                // Calculate cutoff day
                const start = new Date(startDate);
                const end = new Date(suspensionDate);
                const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

                try {
                    const Curriculum = require('../../models/Curriculum').default;
                    const cur = await Curriculum.findOne({ id: 'curriculum' });
                    if (cur) {
                        const weeks = cur.weeks || [];
                        weeks.forEach((w: any) => {
                            const weekStartDay = (Number(w.id) - 1) * 7 + 1;
                            if (w.days) {
                                Object.entries(w.days).forEach(([dayId, ids]: [string, any]) => {
                                    const actualDay = weekStartDay + (Number(dayId) - 1);
                                    if (actualDay <= diffDays) {
                                        (ids || []).forEach((id: string) => allowedMcampIds.add(id));
                                    }
                                });
                            }
                        });
                    }
                } catch (err) {
                    console.error("Failed to fetch curriculum for suspension filter:", err);
                }
            } else {
                // Not suspended: Permanent lifetime access to all MCAMP content
                allResources.forEach(res => {
                    const tags = (res.tags || []).map(t => t.toLowerCase());
                    if (res.isMcampExclusive || tags.includes('mcamp')) {
                        allowedMcampIds.add(res.id);
                    }
                });
            }
        }

        return allResources.filter((res: ResourceDocument) => {
            const resYear = (res.year || '').toLowerCase();
            const resTags = (res.tags || []).map(t => t.toLowerCase());

            // Check if explicitly allowed (MCAMP whitelist)
            if (allowedMcampIds.has(res.id)) return true;

            // Block MCAMP exclusives for non-members or those without explicit whitelist
            if (res.isMcampExclusive || resTags.includes('mcamp')) {
                return false;
            }

            // Standard Year Matching Logic for General Resources
            const isGeneralRes = !resYear || resYear === 'general' || resYear === '' || resTags.includes('general');
            if (isGeneralRes || userYear === 'general') return true;

            const getLevel = (s: string) => {
                const n = s.match(/\d+/);
                return n ? n[0] : s;
            };
            const userLvl = getLevel(userYear);
            const resLvl = getLevel(resYear);

            return resYear === userYear ||
                userYear.includes(resYear) ||
                resYear.includes(userYear) ||
                userLvl === resLvl ||
                resTags.includes(userYear) ||
                resTags.some(tag => userYear.includes(tag) || tag.includes(userYear));
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
