
import { db } from '../../config/firebase';
import { admin } from '../../config/firebase'; // Ensure we export admin from config
import { ActivitySession } from '../../types/firestore-v3';
import { FieldValue } from 'firebase-admin/firestore';

export class ActivityService {
    /**
     * Log a user study session and update their aggregate stats (The Dashboard Graphs).
     */
    static async logSession(uid: string, sessionData: ActivitySession) {
        const batch = db.batch();

        // 1. Save Raw Log (for deep auditing later)
        const sessionRef = db.collection('users').doc(uid).collection('activity_sessions').doc();
        batch.set(sessionRef, {
            ...sessionData,
            createdAt: new Date().toISOString()
        });

        // 2. Update Aggregates (The "Live" Dashboard Numbers)
        const userRef = db.collection('users').doc(uid);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const currentMonth = new Date().toLocaleString('default', { month: 'short' }); // "Jan", "Feb"

        // Calculate hours from this session
        const hoursToAdd = sessionData.durationSeconds / 3600;

        // Atomically increment totals
        batch.update(userRef, {
            'analytics.totalSecondsStudied': FieldValue.increment(sessionData.durationSeconds),
            'analytics.lastActive': new Date().toISOString()
        });

        // Note: For complex nested array updates (monthlyActivity), usually we'd read-modify-write
        // or use a subcollection for 'daily_stats' and aggregate on read. 
        // For simplicity in V3, we will use a dedicated subcollection for daily stats 
        // and let the frontend query that for the graph.

        const dailyStatRef = userRef.collection('stats_daily').doc(today);
        batch.set(dailyStatRef, {
            date: today,
            seconds: FieldValue.increment(sessionData.durationSeconds),
            resourceIds: FieldValue.arrayUnion(sessionData.resourceId)
        }, { merge: true });

        await batch.commit();
        return { success: true };
    }
}
