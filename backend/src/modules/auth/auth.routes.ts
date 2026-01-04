import express from 'express';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import { User } from '../../models/User';
import { EmailService } from '../../services/email.service';

const router = express.Router();

// Helper to generate a link settings object (optional, for handling web vs mobile redirects)
const actionCodeSettings = {
    url: 'https://medicohub.com.ng/dashboard', // Redirect here after verification/reset is handled
    handleCodeInApp: false, // The link opens a webpage, not the app directly
};

/**
 * POST /api/v1/auth/send-verification
 * Generates a Firebase Email Verification Link and sends it via Resend.
 */
router.post('/send-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // 1. Generate the link using Firebase Admin SDK
        const firebaseLink = await getAuth().generateEmailVerificationLink(email);

        // 2. Extract oobCode and construct Custom Frontend Link
        // We parse the generated firebase link to get the 'oobCode'
        const urlObj = new URL(firebaseLink);
        const oobCode = urlObj.searchParams.get('oobCode');
        const mode = urlObj.searchParams.get('mode') || 'verifyEmail';

        // Construct the branded link pointing to our React App
        // Frontend uses HashRouter, so we use /#/verify-email
        const link = `https://medicohub.com.ng/#/verify-email?mode=${mode}&oobCode=${oobCode}`;

        // 2. Send the branded email using Resend
        await EmailService.sendVerificationEmail(email, link);

        res.status(200).json({ message: 'Verification email sent successfully' });
    } catch (error: any) {
        console.error('Error sending verification email:', error);
        res.status(500).json({ error: error.message || 'Failed to send verification email' });
    }
});

/**
 * POST /api/v1/auth/send-reset
 * Generates a Firebase Password Reset Link and sends it via Resend.
 */
// [REPLACED WITH CUSTOM FLOW]
router.post('/send-reset', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user) {
            // Silently fail or return success to prevent enumeration (or 404 if preferred for admin)
            // For now, let's return 404 to help the specific user debug
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate Custom Token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

        user.resetToken = resetToken;
        user.resetTokenExpires = resetTokenExpires;
        await user.save();

        // Construct Link with ?token=... ONLY (no mode/oobCode needed for custom flow)
        const link = `https://medicohub.com.ng/#/reset-password?token=${resetToken}`;

        await EmailService.sendPasswordResetEmail(email, link);

        res.status(200).json({ message: 'Password reset link sent (Custom Flow)' });
    } catch (error: any) {
        console.error('Error sending reset email:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/v1/auth/confirm-reset
 * Verifies the custom token and updates the password via Admin SDK.
 */
router.post('/confirm-reset', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        // Find user by token and ensure it hasn't expired
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: new Date() }
        }).select('+resetToken'); // explicitly select it since it's hidden

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Update Password in Firebase Auth
        await getAuth().updateUser(user.uid, { password: newPassword });

        // Clear token
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
