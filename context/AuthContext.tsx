import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { User as AppUser } from '../types';

type SessionUser = AppUser & {
    id?: string;
    uid?: string;
    role?: string;
    displayName?: string;
    image?: string;
    photoURL?: string;
    emailVerified?: boolean;
};

interface AuthContextType {
    user: SessionUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    googleSignIn: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (payload: any): SessionUser | null => {
    const user = payload?.user || payload;
    if (!user) return null;
    return {
        ...user,
        id: user.id || user.uid,
        uid: user.uid || user.id,
        name: user.name || user.displayName || '',
        displayName: user.displayName || user.name || '',
        email: user.email || '',
        image: user.image || user.photoURL,
        photoURL: user.photoURL || user.image,
        year: user.year || user.academicYear || 'General',
        academicYear: user.academicYear || user.year || 'General',
        weakness: Array.isArray(user.weakness) ? user.weakness : [],
        currentCourses: Array.isArray(user.currentCourses) ? user.currentCourses : [],
        isSubscribed: !!user.isSubscribed,
        joinedDate: user.joinedDate || user.createdAt || new Date().toISOString(),
        emailVerified: user.emailVerified ?? false,
    } as SessionUser;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);

    const loadSession = async () => {
        try {
            const payload = await api.auth.session();
            setUser(normalizeUser(payload));
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSession();
    }, []);

    const login = async (email: string, password: string) => {
        const result = await api.auth.login(email, password);
        if (!result?.ok) {
            const message = result?.data?.error || result?.data?.message || 'Authentication failed';
            throw new Error(message);
        }
        await loadSession();
    };

    const signup = async (name: string, email: string, password: string) => {
        const result = await api.auth.register(name, email, password);
        if (result?.error) {
            throw new Error(result.error);
        }
    };

    const logout = async () => {
        await api.auth.logout();
        setUser(null);
    };

    const googleSignIn = async () => {
        api.auth.googleSignIn();
    };

    const deleteAccount = async () => {
        if (!user?.uid) return;
        await api.users.delete(user.uid);
        await logout();
    };

    const sendVerificationEmail = async () => {
        if (user?.email) {
            await api.auth.requestVerification(user.email);
        }
    };

    const resetPassword = async (email: string) => {
        await api.auth.requestReset(email);
    };

    const refreshSession = async () => {
        await loadSession();
    };

    const value = useMemo(() => ({
        user,
        loading,
        login,
        signup,
        logout,
        googleSignIn,
        deleteAccount,
        sendVerificationEmail,
        resetPassword,
        refreshSession
    }), [user, loading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
