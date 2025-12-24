
import { Router } from 'express';
import { ResourceService } from './resource.service';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';

const router = Router();

// GET /api/v3/resources/:id/context
// Authenticated: Fetch resource context (text) for AI
router.get('/:id/context', verifyAuth, async (req, res) => {
    try {
        const context = await ResourceService.getResourceContext(req.params.id);
        if (!context) return res.status(404).json({ error: "Resource not found" });
        res.json(context);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch context" });
    }
});

// GET /api/v3/resources/admin/all
// Admin: Fetch ALL resources without filtering
router.get('/admin/all', verifyAdmin, async (req, res) => {
    try {
        const results = await ResourceService.getAllResources();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch all resources" });
    }
});

// GET /api/v3/resources
// Fetches resources filtered by the authenticated user's profile tags
router.get('/', verifyAuth, async (req, res) => {
    try {
        // Fetch full profile from DB to get 'academicYear' and 'mcamp' status
        // We dynamic require to avoid circular dependency issues if any, though likely safe
        const { db } = require('../../config/firebase');

        if (!req.user) return res.status(401).json({ error: "Unauthorized" });

        const userSnapshot = await db.collection('users').doc(req.user.uid).get();
        const userProfile = userSnapshot.data() || {};

        const resources = await ResourceService.getResourcesForUser(userProfile);
        res.json(resources);
    } catch (error) {
        console.error("Error fetching resources:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// POST /api/v3/resources (Admin only)
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const result = await ResourceService.createResource(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to create resource" });
    }
});

// DELETE /api/v3/resources/:id (Admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await ResourceService.deleteResource(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete resource" });
    }
});

export default router;
