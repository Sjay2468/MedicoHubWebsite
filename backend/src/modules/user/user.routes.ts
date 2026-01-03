import { Router, Request, Response } from 'express';
import { User } from '../../models/User';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';
import { auth, admin } from '../../config/firebase';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Forbidden
 */
router.get('/', verifyAuth, verifyAdmin, async (req: Request, res: Response) => {
    try {
        const limitVal = parseInt(req.query.limit as string) || 100;
        const filter = req.query.filter as string; // 'requests'

        let users;
        if (filter === 'requests') {
            // Find users who have a requestedYear set
            users = await User.find({ requestedYear: { $ne: null } })
                .sort({ createdAt: -1 })
                .limit(limitVal);
        } else {
            users = await User.find()
                .sort({ createdAt: -1 })
                .limit(limitVal);
        }

        res.json(users);
    } catch (error) {
        console.error("Error fetching users from MongoDB:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * @swagger
 * /api/v1/users/{uid}/ban:
 *   patch:
 *     summary: Ban or Unban a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ban:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User status updated
 */
router.patch('/:uid/ban', verifyAuth, verifyAdmin, async (req: Request, res: Response) => {
    const { uid } = req.params;
    const { ban } = req.body;

    try {
        // 1. Disable in Firebase Auth
        await auth.updateUser(uid, { disabled: ban });

        // 2. Update status in MongoDB
        await User.findOneAndUpdate(
            { uid },
            { $set: { status: ban ? 'suspended' : 'active' } },
            { upsert: true }
        );

        res.json({ success: true, message: `User ${ban ? 'banned' : 'unbanned'}` });
    } catch (error) {
        console.error("Error banning user:", error);
        res.status(500).json({ error: "Failed to update user status" });
    }
});

/**
 * @swagger
 * /api/v1/users/{uid}/subscription:
 *   patch:
 *     summary: Manually override subscription status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPro:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Subscription updated
 */
router.patch('/:uid/subscription', verifyAuth, verifyAdmin, async (req: Request, res: Response) => {
    const { uid } = req.params;
    const { isPro } = req.body;

    try {
        await User.findOneAndUpdate({ uid }, { isSubscribed: isPro });
        res.json({ success: true, message: `User subscription ${isPro ? 'activated' : 'deactivated'}` });
    } catch (error) {
        console.error("Error updating subscription:", error);
        res.status(500).json({ error: "Failed to update subscription" });
    }
});

// DELETE /api/v1/users/:uid
// Permanently delete a user (Auth + MongoDB)
router.delete('/:uid', verifyAuth, async (req: Request, res: Response) => {
    const { uid } = req.params;

    // Security: Only allow user to delete themselves OR an admin
    // Security: Only allow user to delete themselves OR an admin
    // @ts-ignore
    if (req.user.uid !== uid && req.user.admin !== true && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied. You can only delete your own account." });
    }

    try {
        // 1. Delete from Firebase Auth (Optional: Usually handled by client before calling this, 
        // but for admin deletion it's necessary here)
        try {
            await auth.deleteUser(uid);
        } catch (e: any) {
            console.warn("Auth deletion failed (might be already deleted):", e.message);
        }

        // 2. Delete from MongoDB
        await User.findOneAndDelete({ uid });

        res.json({ success: true, message: "User permanently deleted" });
    } catch (error) {
        console.error("Error deleting user from MongoDB:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

/**
 * @swagger
 * /api/v1/users/{uid}/profile:
 *   get:
 *     summary: Get user profile from MongoDB
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/:uid/profile', verifyAuth, async (req: Request, res: Response) => {
    const { uid } = req.params;
    try {
        const user = await User.findOne({ uid });
        if (!user) return res.status(404).json({ error: "User not found in MongoDB" });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * @swagger
 * /api/v1/users/{uid}/profile:
 *   patch:
 *     summary: Update user profile (Photo, Name, Year)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               photoURL:
 *                 type: string
 *               name:
 *                 type: string
 *               academicYear:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/:uid/profile', verifyAuth, async (req: Request, res: Response) => {
    const { uid } = req.params;
    const items = req.body;

    // Security check: Only allow user to edit their own profile OR admin
    // @ts-ignore
    // Security check: Only allow user to edit their own profile OR admin
    // @ts-ignore
    if (req.user.uid !== uid && req.user.admin !== true && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        const updates: any = {};

        // Map common fields
        const allowedFields = [
            'name', 'firstName', 'surname', 'email', 'phoneNumber',
            'institution', 'schoolName', 'photoURL', 'academicYear',
            'requestedYear', 'weakness', 'currentCourses', 'isSubscribed',
            'mcamp', 'analytics', 'resourceProgress', 'status', 'uid'
        ];

        console.log(`[User Update] UID: ${uid}, Fields:`, Object.keys(items));

        allowedFields.forEach(field => {
            if (items[field] !== undefined) {
                updates[field] = items[field];
            }
        });

        // Handle 'year' alias from frontend
        if (items.year !== undefined && updates.academicYear === undefined) {
            updates.academicYear = items.year;
        }

        // If photoURL or name is updated, also update Firebase Auth Profile (Sync for Auth only)
        if (updates.photoURL || updates.name) {
            await auth.updateUser(uid, {
                photoURL: updates.photoURL || undefined,
                displayName: updates.name || undefined
            });
        }

        const user = await User.findOneAndUpdate(
            { uid },
            { $set: updates },
            { new: true, upsert: true }
        );

        res.json({ success: true, user });
    } catch (error) {
        console.error("Error updating profile in MongoDB:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

export default router;
