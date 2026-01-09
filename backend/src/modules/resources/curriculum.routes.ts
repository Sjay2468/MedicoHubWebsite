import { Router } from 'express';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';
import Curriculum from '../../models/Curriculum';

const router = Router();

import { optionalAuth } from '../../middleware/auth.middleware';
import { User } from '../../models/User';
import Cohort from '../../models/Cohort';

// GET /api/v1/curriculum
router.get('/', optionalAuth, async (req, res) => {
    try {
        // 1. Try to load Cohort-specific curriculum for logged-in users
        if (req.user && req.user.uid) {
            const user = await User.findOne({ uid: req.user.uid });
            if (user?.mcamp?.cohortId) {
                const cohort = await Cohort.findById(user.mcamp.cohortId);
                if (cohort) {
                    return res.json({
                        weeks: cohort.weeks,
                        targetYear: cohort.targetYear,
                        currentSessionId: cohort.uniqueId,
                        startDate: cohort.startDate, // Critical for relative scheduling
                        isCohort: true
                    });
                }
            }
        }

        // 2. Fallback to Global / Default Curriculum
        let curriculum = await Curriculum.findOne({ id: 'curriculum' });
        if (!curriculum) {
            return res.json({ weeks: [], targetYear: '' });
        }
        res.json(curriculum);
    } catch (error: any) {
        console.error("Curriculum Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch curriculum" });
    }
});

// POST /api/v1/curriculum (Admin only)
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { weeks, targetYear, activeCohortId } = req.body;
        const result = await Curriculum.findOneAndUpdate(
            { id: 'curriculum' },
            { weeks, targetYear, activeCohortId, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: "Failed to update curriculum in MongoDB" });
    }
});

export default router;
