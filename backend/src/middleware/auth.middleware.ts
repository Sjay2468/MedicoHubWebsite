import { Request, Response, NextFunction } from 'express';
import { resolveSessionUser } from '../config/auth';

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

const isAdminUser = (user: any) => user?.role === 'admin' || user?.admin === true;

export const verifyAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await resolveSessionUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: Please sign in again.' });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'Forbidden: Account suspended' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth Error:', error);
        return res.status(403).json({ error: 'Unauthorized: Invalid session' });
    }
};

export const verifyAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const adminSecret = process.env.ADMIN_SECRET || 'medico_admin_secret_2025';
    if (req.headers['x-admin-secret'] === adminSecret) {
        return next();
    }

    if (!req.user) {
        try {
            const user = await resolveSessionUser(req);
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized: Please sign in again.' });
            }
            req.user = user;
        } catch (error) {
            console.error('verifyAdmin auth error:', error);
            return res.status(403).json({ error: 'Unauthorized: Invalid session' });
        }
    }

    if (isAdminUser(req.user)) {
        return next();
    }

    return res.status(403).json({ error: 'Forbidden: Admin access required' });
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await resolveSessionUser(req);
        if (user) req.user = user;
    } catch {
        // Optional auth should never block the request.
    }
    next();
};
