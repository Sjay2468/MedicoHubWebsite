import { Router, Request, Response } from 'express';
import { User } from '../../models/User';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';
import { auth, admin } from '../../config/firebase';
import { EmailService } from '../../services/email.service';

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

/**
 * @swagger
 * /api/v1/users/auth/reset-password:
 *   post:
 *     summary: Request password reset email via Resend
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 */
router.post('/auth/reset-password', async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
        // Generate a standard Firebase password reset link
        const link = await admin.auth().generatePasswordResetLink(email, {
            url: process.env.FRONTEND_URL || 'https://medicohub.com.ng/login'
        });

        // Send it via our custom Resend template
        await EmailService.sendPasswordResetEmail(email, link);

        res.json({ success: true, message: "Reset email sent successfully" });
    } catch (error: any) {
        console.error("Password reset link generation failed:", error);
        res.status(500).json({ error: error.message || "Failed to process request" });
    }
});

/**
 * @swagger
 * /api/v1/users/auth/verify-email:
 *   post:
 *     summary: Request email verification via Resend
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/auth/verify-email', verifyAuth, async (req: Request, res: Response) => {
    const email = req.user.email;
    if (!email) return res.status(400).json({ error: "User email not found" });

    try {
        const link = await admin.auth().generateEmailVerificationLink(email, {
            url: process.env.FRONTEND_URL || 'https://medicohub.com.ng/dashboard'
        });

        await EmailService.sendVerificationEmail(email, link);

        res.json({ success: true, message: "Verification email sent successfully" });
    } catch (error: any) {
        console.error("Verification link generation failed:", error);

        let message = "Failed to process request";
        if (error.code === 'auth/too-many-attempts-try-later') {
            message = "Too many verification attempts. Please wait a few minutes before trying again.";
        } else if (error.message) {
            message = error.message;
        }

        res.status(error.code === 'auth/too-many-attempts-try-later' ? 429 : 500).json({
            error: message,
            code: error.code
        });
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

        // Explicitly map for frontend compatibility
        const userData = user.toObject();
        userData.year = userData.academicYear || userData.year;

        res.json({ success: true, user: userData });
    } catch (error: any) {
        console.error(`[UserUpdate] ERROR updating UID ${uid}:`, error);
        res.status(500).json({
            error: "Failed to update user profile",
            message: error.message,
            details: error.errors ? Object.keys(error.errors) : undefined
        });
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

        // Map common fields with dot-notation for deep updates
        Object.keys(items).forEach(key => {
            const val = items[key];
            if (val === undefined) return;

            // Handle nested objects with dot-notation to prevent overwriting whole structures
            if (key === 'mcamp' && typeof val === 'object' && val !== null) {
                Object.keys(val).forEach(subKey => {
                    updates[`mcamp.${subKey}`] = val[subKey];
                });
            } else if (key === 'analytics' && typeof val === 'object' && val !== null) {
                Object.keys(val).forEach(subKey => {
                    updates[`analytics.${subKey}`] = val[subKey];
                });
            } else if (key === 'resourceProgress' && typeof val === 'object' && val !== null) {
                Object.keys(val).forEach(subKey => {
                    updates[`resourceProgress.${subKey}`] = val[subKey];
                });
            } else if (key === 'year' || key === 'academicYear') {
                // Ensure field mapping preservation and prevent accidental wipes
                if (val && val !== '' && val !== 'General') {
                    updates.academicYear = val;
                } else if (val === 'General') {
                    // Allow set to General if specifically requested (rare), 
                    // but we usually want to block this for onboarded users.
                    updates.academicYear = 'General';
                }
            } else if (key === 'profileImage' || key === 'photoURL') {
                if (val && val !== '') {
                    updates.photoURL = val;
                }
            } else {
                updates[key] = val;
            }
        });

        console.log(`[User Update] UID: ${uid}, Fields:`, Object.keys(updates));

        // Fetch old state to detect transitions
        const oldUser = await User.findOne({ uid });

        // If photoURL or name is updated, also update Firebase Auth Profile (Sync for Auth only)
        if (updates.photoURL || updates.name) {
            await auth.updateUser(uid, {
                photoURL: updates.photoURL || undefined,
                displayName: updates.name || undefined
            });
        }

        const user = await User.findOneAndUpdate(
            { uid },
            {
                $set: updates,
                $setOnInsert: {
                    email: updates.email || req.user.email || '',
                    name: updates.name || 'Student', // Default name to satisfy MongoDB validation
                    role: 'student'
                }
            },
            { new: true, upsert: true, runValidators: true }
        );

        // --- EMAIL TRIGGERS ---
        if (user) {
            // 1. Welcome Email: Send if name was just set and they didn't have one before
            // Or if it's a completely new user document (oldUser is null)
            const isNewUser = !oldUser;
            const nameJustSet = !oldUser?.name && updates.name;
            console.log(`[UserUpdate] Email Trigger - isNewUser: ${isNewUser}, nameJustSet: ${nameJustSet}, updates.name: ${updates.name}`);

            if (isNewUser || nameJustSet) {
                EmailService.sendWelcomeEmail(user).catch(e => console.error("Welcome email failed", e));
            }

            // 2. MCAMP Welcome: Send if mcamp.isEnrolled transitioned from false/undefined to true
            const wasEnrolled = oldUser?.mcamp?.isEnrolled;
            const isEnrolled = user.mcamp?.isEnrolled;
            if (isEnrolled && !wasEnrolled) {
                EmailService.sendMcampWelcomeEmail(user, user.mcamp?.uniqueId || 'PENDING').catch(e => console.error("MCAMP email failed", e));
            }
        }

        // Explicitly map for frontend compatibility
        const userData = user ? user.toObject() : null;
        if (userData) {
            userData.year = userData.academicYear || userData.year;
        }

        res.json({ success: true, user: userData });
    } catch (error) {
        console.error("Error updating profile in MongoDB:", error);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

export default router;
