import { Resource } from '../../models/Resource';
import { ResourceDocument } from '../../types/firestore-v3'; // We can keep this type or use IResource
import { extractTextFromPDF, extractTextFromYouTube } from '../../utils/textExtractor';
import { LRUCache } from 'lru-cache';

// Database Optimization: Offload text storage to in-memory cache
// This prevents the 512MB MongoDB limit from filling up with large transcripts.
// Text is extracted on-demand and kept in memory only while active/recent.
const contextCache = new LRUCache<string, string>({
    max: 50, // Keep max 50 resources in memory to prevent RAM overflow
    ttl: 1000 * 60 * 60, // 1 Hour TTL (User usually finishes studying in this time)
    allowStale: false,
});

export class ResourceService {
    /**
     * Fetch resources tailored to a user's profile.
     * Logic:
     * 1. Fetch ALL resources (for now, optimization later).
     * 2. Filter by User's 'academicYear' tag (e.g., 'Year 2').
     * 3. Include generic tags (e.g., 'General').
     * 4. If user is in MCAMP, include 'MCAMP' tagged resources.
     */
    static async getResourcesForUser(userProfile: any) {
        // Fetch all using Mongoose
        const allResourcesRaw = await Resource.find().sort({ createdAt: -1 }).lean();

        // Map _id to id
        const allResources = allResourcesRaw.map(r => ({
            ...r,
            id: r._id.toString()
        })) as unknown as ResourceDocument[];

        const userYear = userProfile.academicYear || 'General';
        const isMcamp = userProfile.mcamp?.isEnrolled || false;

        return allResources.filter((res: ResourceDocument) => {
            // Strict Validation: Hide resources that don't have a target year set
            if (!res.year || res.year.trim() === '') {
                return false;
            }

            // Check Tags
            const isYearMatch = res.tags.includes(userYear) || res.tags.includes('General');

            // MCAMP Exclusivity Logic
            if (res.isMcampExclusive) {
                return isMcamp; // Only show if user is enrolled
            }

            return isYearMatch;
        });
    }

    static async createResource(data: any) {
        // DB Optimization: Do NOT extract text here.
        // We save the resource metadata only. Text is extracted on read (Lazy Loading).

        // Create in MongoDB
        const newResource = await Resource.create(data);

        return {
            ...newResource.toObject(),
            id: newResource._id.toString()
        };
    }

    static async getAllResources() {
        const allResourcesRaw = await Resource.find().sort({ createdAt: -1 }).lean();
        return allResourcesRaw.map(r => ({
            ...r,
            id: r._id.toString()
        }));
    }

    static async deleteResource(id: string) {
        await Resource.findByIdAndDelete(id);
        // Also clear from cache if exists
        if (contextCache.has(id)) contextCache.delete(id);
        return { success: true };
    }

    static async getResourceContext(id: string) {
        // 1. Check In-Memory Cache first (Fastest)
        if (contextCache.has(id)) {
            console.log(`[Cache] Hit for resource ${id}`);
            return {
                id,
                extractedText: contextCache.get(id)
            };
        }

        // 2. Fetch from DB
        const resource = await Resource.findById(id).select('+extractedText').lean();
        if (!resource) return null;

        // 3. Resolve Text
        // - Priority A: Legacy text stored in DB
        // - Priority B: Extract on-demand from URL
        let text = resource.extractedText || "";

        if (!text && resource.url) {
            console.log(`[Cache] Miss for ${id}, extracting on-demand from ${resource.type}...`);
            try {
                if (resource.type === 'PDF' || resource.url.endsWith('.pdf')) {
                    text = await extractTextFromPDF(resource.url);
                } else if (resource.type === 'Video' || (resource.url.includes('youtube') && !resource.url.endsWith('.pdf'))) {
                    // Basic check for video type
                    text = await extractTextFromYouTube(resource.url);
                }
            } catch (error) {
                console.error(`[Extraction Error] Failed to extract from ${id}`, error);
                text = "Context unavailable for this resource.";
            }
        }

        // 4. Update Cache (if we have text)
        if (text && text.length > 50) {
            contextCache.set(id, text);
            console.log(`[Cache] Stored ${id} (${text.length} chars)`);
        }

        return {
            id: resource._id.toString(),
            extractedText: text
        };
    }
}
