import { ExpressAuth } from '@auth/express';
import Credentials from '@auth/core/providers/credentials';
import Google from '@auth/core/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'crypto';
import { getNativeMongoClient, getNativeDb } from './native-mongo';
import { User } from '../models/User';
import type { Request } from 'express';

const isProduction = process.env.NODE_ENV === 'production';
const secureCookie = isProduction;
const cookiePrefix = secureCookie ? '__Secure-' : '';

const parseCookies = (cookieHeader = '') => {
    return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
        const [rawKey, ...rest] = part.trim().split('=');
        if (!rawKey) return acc;
        acc[decodeURIComponent(rawKey)] = decodeURIComponent(rest.join('=') || '');
        return acc;
    }, {});
};

const getSessionTokenFromRequest = (req: Request) => {
    const cookies = parseCookies(req.headers.cookie || '');
    return (
        cookies[`${cookiePrefix}authjs.session-token`] ||
        cookies['authjs.session-token'] ||
        cookies[`${cookiePrefix}next-auth.session-token`] ||
        cookies['next-auth.session-token'] ||
        null
    );
};

const findAppUser = async (email?: string | null, uid?: string | null) => {
    if (email) {
        const userByEmail = await User.findOne({ email: email.toLowerCase() });
        if (userByEmail) return userByEmail;
    }

    if (uid) {
        const userByUid = await User.findOne({ uid });
        if (userByUid) return userByUid;
    }

    return null;
};

export const upsertAppUserFromIdentity = async (identity: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
    provider?: string | null;
    uid?: string | null;
}) => {
    const email = identity.email?.toLowerCase();
    if (!email) return null;

    const existing = await findAppUser(email, identity.uid);
    const now = new Date();

    if (existing) {
        existing.name = identity.name || existing.name;
        existing.photoURL = identity.image || existing.photoURL;
        existing.role = existing.role || 'student';
        if (identity.provider === 'google') {
            existing.emailVerified = true as any;
        }
        await existing.save();
        return existing;
    }

    const created = await User.create({
        uid: identity.uid || randomUUID(),
        name: identity.name || 'Student',
        email,
        role: 'student',
        photoURL: identity.image || undefined,
        status: 'active',
        emailVerified: identity.provider === 'google',
        createdAt: now,
        updatedAt: now
    });

    return created;
};

const authConfig = {
    trustHost: true,
    secret: process.env.AUTH_SECRET,
    session: {
        strategy: 'database' as const,
    },
    adapter: MongoDBAdapter(getNativeMongoClient()),
    cookies: {
        sessionToken: {
            name: `${cookiePrefix}authjs.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'none' as const,
                secure: secureCookie,
                path: '/',
            },
        },
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            authorize: async (credentials: Partial<Record<'email' | 'password', unknown>>) => {
                const email = String(credentials?.email || '').trim().toLowerCase();
                const password = String(credentials?.password || '');

                if (!email || !password) return null;

                const user = await User.findOne({ email });
                if (!user || !user.passwordHash) return null;
                if (user.status === 'suspended') throw new Error('Account suspended. Please contact support.');
                if (user.emailVerified === false) throw new Error('Please verify your email before signing in.');

                const ok = await bcrypt.compare(password, user.passwordHash);
                if (!ok) return null;

                return {
                    id: user.uid,
                    name: user.name,
                    email: user.email,
                    image: user.photoURL || null,
                    role: user.role,
                } as any;
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }: { user: any; account?: any }) {
            if (!user?.email) return false;
            const provider = account?.provider || 'credentials';
            const appUser = await upsertAppUserFromIdentity({
                email: user.email,
                name: user.name,
                image: user.image,
                provider,
                uid: user.id,
            });

            if (!appUser) return false;
            if (provider === 'credentials' && appUser.emailVerified === false) {
                return false;
            }

            return true;
        },
        async session({ session, user }: { session: any; user?: any }) {
            const email = session.user?.email?.toLowerCase();
            const appUser = await findAppUser(email, user?.id || null);

            if (session.user) {
                session.user.name = appUser?.name || session.user.name || undefined;
                session.user.email = appUser?.email || session.user.email || undefined;
                session.user.image = appUser?.photoURL || session.user.image || undefined;
                (session.user as any).id = appUser?.uid || user?.id;
                (session.user as any).role = appUser?.role || 'student';
                (session.user as any).uid = appUser?.uid || user?.id;
            }

            return session;
        },
    },
    events: {
        async createUser(message: any) {
            await upsertAppUserFromIdentity({
                email: message?.user?.email,
                name: message?.user?.name,
                image: message?.user?.image,
                provider: 'google',
                uid: message?.user?.id,
            });
        },
    },
};

export const authMiddleware = ExpressAuth(authConfig as any);

export const resolveSessionUser = async (req: Request) => {
    const sessionToken = getSessionTokenFromRequest(req);
    if (!sessionToken) return null;

    const db = await getNativeDb();
    const session = await db.collection('sessions').findOne({ sessionToken });
    if (!session || !session.userId) return null;

    if (session.expires && new Date(session.expires) < new Date()) {
        return null;
    }

    const adapterUser = await db.collection('users').findOne({
        $or: [{ id: session.userId }, { _id: session.userId }]
    });
    const email = adapterUser?.email ? String(adapterUser.email).toLowerCase() : null;
    const appUser = await findAppUser(email, adapterUser?.id || adapterUser?._id?.toString?.() || null);

    if (!appUser) return null;

    return appUser.toObject ? appUser.toObject() : appUser;
};

export const createAuthToken = () => randomBytes(32).toString('hex');
