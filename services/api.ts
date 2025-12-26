import { auth, db } from './firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { ResourceProgress } from '../types';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://medico-hub-backend-0ufb.onrender.com/api/v1';

export const api = {
    coupons: {
        verify: async (code: string, subtotal: number) => {
            const res = await fetch(`${BACKEND_URL}/coupons/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, subtotal })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Invalid coupon');
            }
            return res.json();
        }
    },
    delivery: {
        getZones: async () => {
            const res = await fetch(`${BACKEND_URL}/delivery`);
            if (!res.ok) throw new Error("Failed to fetch delivery zones");
            return res.json();
        }
    },
    orders: {
        create: async (data: any) => {
            const res = await fetch(`${BACKEND_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || "Order creation failed");
            }
            return res.json();
        }
    },
    resources: {
        getAll: async () => {
            const ref = collection(db, 'resources');
            const snapshot = await getDocs(ref);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    },
    products: {
        getAll: async () => {
            const ref = collection(db, 'products');
            const snapshot = await getDocs(ref);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    },
    analytics: {
        logSession: async (sessionData: any) => {
            const ref = collection(db, 'analytics_sessions');
            await addDoc(ref, sessionData);

            // Immediate aggregation to User Profile
            if (sessionData.userId) {
                try {
                    const userRef = doc(db, 'users', sessionData.userId);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const currentAnalytics = userData.analytics || {
                            totalHours: 0,
                            topicsMastered: 0,
                            currentStreak: 0,
                            monthlyActivity: [],
                            yearlyActivity: []
                        };

                        const addedHours = sessionData.durationSeconds / 3600;
                        const newTotal = (currentAnalytics.totalHours || 0) + addedHours;

                        // Update Monthly Activity (Last 30 days)
                        const today = new Date();
                        const dateKey = today.toLocaleString('default', { month: 'short', day: 'numeric' });
                        let monthly = [...(currentAnalytics.monthlyActivity || [])];
                        // Find entry for today
                        const dayIndex = monthly.findIndex((m: any) => m.date === dateKey);
                        if (dayIndex >= 0) {
                            monthly[dayIndex].hours += addedHours;
                        } else {
                            monthly.push({ date: dateKey, hours: addedHours });
                            // Keep only last 30
                            if (monthly.length > 30) monthly.shift();
                        }

                        // Update Yearly Activity (Jan-Dec)
                        const monthName = today.toLocaleString('default', { month: 'short' });
                        let yearly = [...(currentAnalytics.yearlyActivity || [])];
                        const monthIndex = yearly.findIndex((y: any) => y.month === monthName);
                        if (monthIndex >= 0) {
                            yearly[monthIndex].hours += addedHours;
                        } else {
                            yearly.push({ month: monthName, hours: addedHours });
                        }

                        // Streak Logic
                        let newStreak = currentAnalytics.currentStreak || 0;
                        const lastDate = currentAnalytics.lastStudyDate ? new Date(currentAnalytics.lastStudyDate) : null;

                        // Check if we already studied today (to avoid double counting)
                        const isSameDay = lastDate && lastDate.toDateString() === today.toDateString();

                        if (!isSameDay) {
                            // Check if last study was yesterday
                            const yesterday = new Date(today);
                            yesterday.setDate(today.getDate() - 1);

                            const isConsecutive = lastDate && lastDate.toDateString() === yesterday.toDateString();

                            if (isConsecutive) {
                                newStreak += 1;
                            } else {
                                // Reset to 1 (started today)
                                newStreak = 1;
                            }
                        }

                        await updateDoc(userRef, {
                            analytics: {
                                ...currentAnalytics,
                                totalHours: newTotal,
                                monthlyActivity: monthly,
                                yearlyActivity: yearly,
                                currentStreak: newStreak,
                                lastStudyDate: new Date().toISOString()
                            }
                        });
                    }
                } catch (err) {
                    console.error("Aggregation failed:", err);
                }
            }
            return { success: true };
        },
        getUserProgress: async (userId: string) => {
            const ref = collection(db, 'users', userId, 'resource_progress');
            const snapshot = await getDocs(ref);
            return snapshot.docs.map(d => ({ resourceId: d.id, ...d.data() })) as ResourceProgress[];
        },
        updateResourceProgress: async (userId: string, resourceId: string, progressData: Partial<ResourceProgress>) => {
            const ref = doc(db, 'users', userId, 'resource_progress', resourceId);
            await setDoc(ref, {
                ...progressData,
                resourceId, // ensure it is set
                userId,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        }
    }
};
