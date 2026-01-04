
import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            try {
                if (u) {
                    const tokenResult = await u.getIdTokenResult();
                    setIsAdmin(!!tokenResult.claims.admin);
                } else {
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error("Auth Check Error:", error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        });
        return unsubscribe;
    }, []);

    const login = async (email: string, pass: string) => {
        const credential = await signInWithEmailAndPassword(auth, email, pass);
        const token = await credential.user.getIdTokenResult();

        // Allow Super Admin explicitly (bypass claim check)
        const isSuperAdmin = email.toLowerCase() === 'medicohub2024@gmail.com';

        if (!token.claims.admin && !isSuperAdmin) {
            await signOut(auth);
            throw new Error("Unauthorized: Access restricted to administrators only.");
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    const resetPassword = async (email: string) => {
        // Use custom backend to ensure styled email (Resend)
        // Ensure you import { api } from '../services/api';
        try {
            // Try backend first
            // We need to dynamically import api or assume it is available. 
            // Since we can't easily add imports with replace_file_content if we don't match the top,
            // let's use the fetch directly or assume import is added.
            // Actually, let's just do a fetch here to be safe and avoid import mess in this snippet.
            let url = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://medico-backend-06fb.onrender.com';
            url = String(url).trim().replace(/\/$/, "");
            if (!url.endsWith('/api/v1')) url += '/api/v1';

            const res = await fetch(`${url}/auth/send-reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (!res.ok) throw new Error("Backend reset failed");
        } catch (e) {
            console.warn("Custom reset failed, falling back to Firebase:", e);
            await sendPasswordResetEmail(auth, email);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, login, logout, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
