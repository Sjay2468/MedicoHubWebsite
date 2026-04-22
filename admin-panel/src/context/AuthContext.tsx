import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

interface SessionUser {
    id?: string;
    uid?: string;
    name?: string;
    displayName?: string;
    email?: string;
    image?: string;
    photoURL?: string;
    role?: string;
    status?: string;
    emailVerified?: boolean;
}

interface AuthContextType {
    user: SessionUser | null;
    loading: boolean;
    isAdmin: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (payload: any): SessionUser | null => {
    const user = payload?.user || payload;
    if (!user) return null;
    return {
        ...user,
        uid: user.uid || user.id,
        id: user.id || user.uid,
        name: user.name || user.displayName || '',
        displayName: user.displayName || user.name || '',
        image: user.image || user.photoURL,
        photoURL: user.photoURL || user.image,
        role: user.role || 'student',
        emailVerified: user.emailVerified ?? false,
    };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const loadSession = async () => {
        try {
            const payload = await api.auth.session();
            const current = normalizeUser(payload);
            setUser(current);
            setIsAdmin(!!current && (current.role === 'admin'));
        } catch {
            setUser(null);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSession();
    }, []);

    const login = async (email: string, pass: string) => {
        const result = await api.auth.login(email, pass);
        if (!result?.ok) {
            const message = result?.data?.error || result?.data?.message || 'Authentication failed';
            throw new Error(message);
        }

        await loadSession();
        if (!isAdmin && user?.role !== 'admin') {
            // Re-check after session load; the session user is the source of truth.
            const session = normalizeUser(await api.auth.session());
            if (!session || session.role !== 'admin') {
                await logout();
                throw new Error('Unauthorized: Access restricted to administrators only.');
            }
        }
    };

    const logout = async () => {
        await api.auth.logout();
        setUser(null);
        setIsAdmin(false);
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
        isAdmin,
        login,
        logout,
        resetPassword,
        refreshSession
    }), [user, loading, isAdmin]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
