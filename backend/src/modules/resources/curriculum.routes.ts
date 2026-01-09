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
                // ALREADY ENROLLED: Return specific cohort
                const cohort = await Cohort.findById(user.mcamp.cohortId);
                if (cohort) {
                    return res.json({
                        weeks: cohort.weeks,
                        targetYear: cohort.targetYear,
                        currentSessionId: cohort.uniqueId,
                        startDate: cohort.startDate,
                        isCohort: true
                    });
                }
            } else if (user?.academicYear) {
                // NOT ENROLLED: Smart Match - Find active cohort for their year
                // This allows Year 3 students to see Year 3 cohort instead of default Year 2
                const matchingCohort = await Cohort.findOne({
                    status: 'active',
                    targetYear: { $regex: new RegExp(`^${user.academicYear}`, 'i') } // weak match "Year 3" vs "Year 3 (300L)"
                }).sort({ createdAt: -1 }); // Latest one

                if (matchingCohort) {
                    return res.json({
                        weeks: matchingCohort.weeks, // Preview schedule
                        targetYear: matchingCohort.targetYear,
                        currentSessionId: matchingCohort.uniqueId, // Critical for enrollment ID
                        startDate: matchingCohort.startDate,
                        activeCohortId: matchingCohort.uniqueId, // Legacy shim
                        isSmartMatch: true
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
