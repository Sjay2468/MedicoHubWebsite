import express from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { User } from '../../models/User';
import { EmailService } from '../../services/email.service';
import { getNativeDb } from '../../config/native-mongo';
import { resolveSessionUser } from '../../config/auth';

const router = express.Router();

const USER_FRONTEND_URL = process.env.USER_FRONTEND_URL || process.env.FRONTEND_URL || 'https://medicohub.com.ng';
const VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;
const RESET_TTL_MS = 1000 * 60 * 60;

const buildFrontendUrl = (path: string, params: Record<string, string>) => {
    const base = USER_FRONTEND_URL.replace(/\/$/, '');
    const hashPath = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
    const query = new URLSearchParams(params).toString();
    return `${base}/${hashPath}${query ? `?${query}` : ''}`;
};

const createToken = () => randomBytes(32).toString('hex');

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        const passwordHash = await bcrypt.hash(String(password), 12);
        const emailVerificationToken = createToken();

        const user = await User.create({
            uid: randomUUID(),
            name: String(name).trim(),
            email: normalizedEmail,
            passwordHash,
            emailVerified: false,
            emailVerificationToken,
            emailVerificationExpires: new Date(Date.now() + VERIFICATION_TTL_MS),
            role: 'student',
            status: 'active'
        });

        const link = buildFrontendUrl('/verify-email', {
            token: emailVerificationToken,
            email: normalizedEmail
        });

        await EmailService.sendVerificationEmail(user.email, link);
        return res.status(201).json({
            success: true,
            message: 'Account created. Check your email to verify your account.'
        });
    } catch (error: any) {
        console.error('Registration failed:', error);
        return res.status(500).json({ error: error.message || 'Failed to create account' });
    }
});

router.get('/session', async (req, res) => {
    try {
        const user = await resolveSessionUser(req);
        if (!user) {
            return res.status(401).json({ error: 'No active session' });
        }

        return res.json({ success: true, user });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to resolve session' });
    }
});

router.post('/request-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await User.findOne({ email: String(email).trim().toLowerCase() });
        if (!user) {
            return res.status(200).json({ message: 'If the account exists, a verification email will be sent shortly.' });
        }

        const token = createToken();
        user.emailVerificationToken = token;
        user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);
        await user.save();

        const link = buildFrontendUrl('/verify-email', {
            token,
            email: user.email
        });

        await EmailService.sendVerificationEmail(user.email, link);
        return res.json({ success: true, message: 'Verification email sent successfully' });
    } catch (error: any) {
        console.error('Failed to send verification email:', error);
        return res.status(500).json({ error: error.message || 'Failed to send verification email' });
    }
});

router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined as any;
        user.emailVerificationExpires = undefined as any;
        await user.save();

        return res.json({ success: true, message: 'Email verified successfully' });
    } catch (error: any) {
        console.error('Email verification failed:', error);
        return res.status(500).json({ error: error.message || 'Failed to verify email' });
    }
});

router.post('/request-reset', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await User.findOne({ email: String(email).trim().toLowerCase() });
        if (!user) {
            return res.status(200).json({ message: 'If the account exists, a reset email will be sent shortly.' });
        }

        const token = createToken();
        user.passwordResetToken = token;
        user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
        await user.save();

        const link = buildFrontendUrl('/reset-password', {
            token,
            email: user.email
        });

        await EmailService.sendPasswordResetEmail(user.email, link);
        return res.json({ success: true, message: 'Password reset email sent successfully' });
    } catch (error: any) {
        console.error('Password reset request failed:', error);
        return res.status(500).json({ error: error.message || 'Failed to send password reset email' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Reset token and new password are required' });
        }

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        user.passwordHash = await bcrypt.hash(String(password), 12);
        user.passwordResetToken = undefined as any;
        user.passwordResetExpires = undefined as any;
        await user.save();

        return res.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
        console.error('Reset password failed:', error);
        return res.status(500).json({ error: error.message || 'Failed to reset password' });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const db = await getNativeDb();
        const cookies = (req.headers.cookie || '').split(';').reduce<Record<string, string>>((acc, part) => {
            const [rawKey, ...rest] = part.trim().split('=');
            if (!rawKey) return acc;
            acc[decodeURIComponent(rawKey)] = decodeURIComponent(rest.join('=') || '');
            return acc;
        }, {});

        const sessionToken =
            cookies['__Secure-authjs.session-token'] ||
            cookies['authjs.session-token'] ||
            cookies['__Secure-next-auth.session-token'] ||
            cookies['next-auth.session-token'] ||
            null;

        if (sessionToken) {
            await db.collection('sessions').deleteOne({ sessionToken });
        }

        const secure = process.env.NODE_ENV === 'production';
        const cookieBase = `${secure ? '__Secure-' : ''}authjs.session-token`;
        res.cookie(cookieBase, '', {
            httpOnly: true,
            secure,
            sameSite: 'none',
            expires: new Date(0),
            path: '/',
        });
        return res.json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Failed to logout' });
    }
});

export default router;
