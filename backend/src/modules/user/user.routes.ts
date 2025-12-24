import { Router, Request, Response } from 'express';
import { User } from '../../models/User';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';
import { auth } from '../../config/firebase'; // Keep auth for Firebase Admin actions

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

        // Fetch users from FIRESTORE (Source of Truth for Medico Hub)
        const snapshot = await auth.admin.firestore().collection('users')
            .orderBy('createdAt', 'desc')
            .limit(limitVal)
            .get();

        const users = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(users);
    } catch (error) {
        console.error("Error listing users from Firestore:", error);
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

        // 2. Update status in Firestore
        await auth.admin.firestore().collection('users').doc(uid).update({
            status: ban ? 'suspended' : 'active',
            updatedAt: new Date().toISOString()
        });

        // 3. Fallback Update in MongoDB (if user exists there)
        await User.findOneAndUpdate({ uid }, { $set: { status: ban ? 'suspended' : 'active' } });

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

/**
 * @swagger
 * /api/v1/users/{uid}:
 *   delete:
 *     summary: Permanently delete a user (Auth + DB)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/:uid', verifyAuth, verifyAdmin, async (req: Request, res: Response) => {
    const { uid } = req.params;

    try {
        // 1. Delete from Firebase Auth
        await auth.deleteUser(uid);

        // 2. Delete from Firestore
        await auth.admin.firestore().collection('users').doc(uid).delete();

        // 3. Delete from MongoDB
        await User.findOneAndDelete({ uid });

        res.json({ success: true, message: "User permanently deleted" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
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
    const { photoURL, name, academicYear } = req.body;

    // Security check: Only allow user to edit their own profile OR admin
    // @ts-ignore
    if (req.user.uid !== uid && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        const updates: any = {};
        if (photoURL) updates.photoURL = photoURL; // Note: Schema might need photoURL
        if (name) updates.name = name;
        if (academicYear) updates.academicYear = academicYear;

        // If photoURL is updated, also update Firebase Auth Profile
        if (photoURL || name) {
            await auth.updateUser(uid, {
                photoURL: photoURL || undefined,
                displayName: name || undefined
            });
        }

        const updatedUser = await User.findOneAndUpdate(
            { uid },
            { $set: updates },
            { new: true }
        );

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

export default router;
