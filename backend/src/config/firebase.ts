import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Check if credentials are provided in env
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.warn("WARNING: FIREBASE_SERVICE_ACCOUNT not found in environment. Backend will fail to connect to Firestore.");
}

try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log("[firebase]: Firebase Admin Initialized");
} catch (error) {
    console.error("[firebase]: Failed to initialize Firebase Admin", error);
}

// Export safe proxies or verify initialization
const getDb = () => {
    try {
        return admin.firestore();
    } catch (e) {
        console.warn("DB Access failed: Firebase Admin not initialized");
        throw new Error("Firebase Service Account Missing. Check backend/.env");
    }
};

const getAuth = () => {
    try {
        return admin.auth();
    } catch (e) {
        console.warn("Auth Access failed: Firebase Admin not initialized");
        throw new Error("Firebase Service Account Missing. Check backend/.env");
    }
};

// Use getters to defer access until runtime (prevents startup crash)
// We cast to any to avoid complex type mocking of Firestore/Auth instances
export const db = {
    collection: (name: string) => getDb().collection(name),
    batch: () => getDb().batch(),
    // Add other methods as needed or rely on runtime
} as any;

export const auth = {
    verifyIdToken: (token: string) => getAuth().verifyIdToken(token),
    updateUser: (uid: string, props: any) => getAuth().updateUser(uid, props)
} as any;

export { admin };
