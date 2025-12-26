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
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

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

            // 3. Create a "User Document" in our database to store their stats and preferences
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                uid: userCredential.user.uid,
                name,
                email,
                createdAt: new Date().toISOString(),
                isSubscribed: false,
                role: 'student',
                analytics: {
                    totalHours: 0,
                    topicsMastered: 0,
                    currentStreak: 0,
                    lastStudyDate: new Date().toISOString(),
                    monthlyActivity: [],
                    yearlyActivity: []
                }
            });
        } catch (error) {
            console.error("Error creating user profile in Firestore:", error);
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
            // 1. Delete Firestore Document
            // Note: This might fail if security rules don't permit direct deletion by the client
            try {
                await deleteDoc(doc(db, 'users', auth.currentUser.uid));
            } catch (fsError) {
                console.warn("Firestore user document deletion failed (likely permissions):", fsError);
                // We continue so the Auth account can still be deleted
            }

            // 2. Delete Auth User
            await auth.currentUser.delete();
        } catch (error: any) {
            console.error("Error deleting account:", error);
            if (error.code === 'auth/requires-recent-login') {
                // Let the UI handle this specific error if needed
            } else if (error.code === 'auth/operation-not-allowed') {
                // Let the UI handle this
            }
            throw error;
        }
    };

    const sendVerificationEmail = async () => {
        if (auth.currentUser) {
            await sendEmailVerification(auth.currentUser);
        }
    };

    const resetPassword = (email: string) => {
        return sendPasswordResetEmail(auth, email);
    };

    const googleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        let isNewUser = false;

        try {
            // Check if user exists, if not create doc
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                isNewUser = true;
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    isSubscribed: false,
                    role: 'student',
                    photoURL: user.photoURL,
                    analytics: {
                        totalHours: 0,
                        topicsMastered: 0,
                        currentStreak: 0,
                        lastStudyDate: new Date().toISOString(),
                        monthlyActivity: [],
                        yearlyActivity: []
                    }
                });
            }
        } catch (error) {
            console.error("Error fetching/creating user profile in Firestore:", error);
            // Non-blocking error
        }

        return isNewUser;
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
