import { Router } from 'express';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';
import Curriculum from '../../models/Curriculum';

const router = Router();

// GET /api/v1/curriculum
router.get('/', async (req, res) => {
    try {
        let curriculum = await Curriculum.findOne({ id: 'curriculum' });
        if (!curriculum) {
            // Return empty structure instead of 404
            return res.json({ weeks: [], targetYear: '' });
        }
        res.json(curriculum);
    } catch (error: any) {
        res.status(500).json({ error: "Failed to fetch curriculum from MongoDB" });
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
