import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
    sendEmailVerification,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../services/firebase';

/**
 * AUTH CONTEXT:
 * This file is the "Manager" for everything related to users logging in and out.
 * It keeps track of who is currently using the website.
 */

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    googleSignIn: () => Promise<boolean>;
    deleteAccount: () => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * This is a custom "Hook" that other components use to get user data.
 * Instead of asking Firebase directly, they ask the AuthContext.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // This listener "watches" the user. If they close the tab and come back, 
        // Firebase tells us who they are automatically.
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signup = async (name: string, email: string, password: string) => {
        // 1. Create the account in Firebase Auth (Email/Password)
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        try {
            // 2. Add their name to their profile
            await updateProfile(userCredential.user, { displayName: name });
            // MongoDB profile will be auto-created on the first API call to GET /profile
        } catch (error) {
            console.error("Error setting up user profile name:", error);
        }
    };

    const login = (email: string, password: string) => {
        return signInWithEmailAndPassword(auth, email, password).then(async () => {
            // You can fetch additional user data here if needed
        });
    };

    const logout = () => {
        return signOut(auth);
    };

    const deleteAccount = async () => {
        if (!auth.currentUser) return;

        try {
            const uid = auth.currentUser.uid;

            // 1. Delete from MongoDB via our API
            try {
                const { api } = await import('../services/api');
                await api.users.delete(uid);
            } catch (fsError) {
                console.warn("MongoDB user document deletion failed:", fsError);
            }

            // 2. Delete Auth User
            await auth.currentUser.delete();
        } catch (error: any) {
            console.error("Error deleting account:", error);
            throw error;
        }
    };

    const sendVerificationEmail = async () => {
        try {
            const { api } = await import('../services/api');
            await api.auth.verifyEmail();
        } catch (error: any) {
            console.error("Failed to send verification email:", error);
            throw error;
        }
    };

    const resetPassword = async (email: string) => {
        try {
            const { api } = await import('../services/api');
            await api.auth.resetPassword(email);
        } catch (error: any) {
            console.error("Failed to send reset email:", error);
            throw error;
        }
    };

    const googleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        // MongoDB profile will be auto-created on the first API call to GET /profile
        return result.user !== null;
    };

    const value = {
        user,
        loading,
        login,
        signup,
        logout,
        googleSignIn,
        deleteAccount,
        sendVerificationEmail,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
