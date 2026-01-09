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
                // Robustness: Fetch ALL cohorts (ignore status for debug)
                const activeCohorts = await Cohort.find().sort({ createdAt: -1 });

                const userYearRaw = (user.academicYear || '').toLowerCase();
                const userLevel = userYearRaw.match(/\d+/)?.[0]; // "3" from "year 3"

                const matchingCohort = activeCohorts.find(c => {
                    const tYear = (c.targetYear || '').toLowerCase();
                    // 1. Direct inclusion (e.g. "year 3" in "year 3 (300l)")
                    if (tYear.includes(userYearRaw) || userYearRaw.includes(tYear)) return true;
                    // 2. Level match (e.g. "3" in "year 3")
                    if (userLevel && tYear.includes(userLevel)) return true;
                    return false;
                });

                console.log(`[SmartMatch] User: ${userYearRaw}, Level: ${userLevel}, Found: ${matchingCohort?.uniqueId}`);

                if (matchingCohort) {
                    return res.json({
                        weeks: matchingCohort.weeks, // Preview schedule
                        targetYear: matchingCohort.targetYear,
                        currentSessionId: matchingCohort.uniqueId, // Critical for enrollment ID
                        startDate: matchingCohort.startDate,
                        activeCohortId: matchingCohort.uniqueId, // Legacy shim
                        isSmartMatch: true,
                        debug: {
                            userUid: req.user.uid,
                            userYear: user.academicYear,
                            cohortsFound: activeCohorts.length,
                            matchId: matchingCohort.uniqueId,
                            matchStatus: matchingCohort.status
                        }
                    });
                }
            }
        }

        // 2. Fallback to Global / Default Curriculum
        let curriculum = await Curriculum.findOne({ id: 'curriculum' });
        if (!curriculum) {
            return res.json({ weeks: [], targetYear: '' });
        }

        // Append debug info to fallback response too
        res.json({
            ...curriculum.toObject(),
            debug: {
                userFound: !!(req.user && req.user.uid),
                userYear: req.user ? (req.user as any).academicYear || 'N/A (Req User Present)' : 'N/A (No Req User)',
                reason: "Fallback reached - No Smart Match or Not Logged In"
            }
        });
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
