import { auth, db } from './firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { ResourceProgress } from '../types';

// Robust URL Handling: Ensure we have the correct base for v1 and v3
const getRootUrl = () => {
    let url = import.meta.env.VITE_API_URL || 'https://medico-backend-06fb.onrender.com';
    url = String(url).trim();
    while (url.endsWith('/') || url.endsWith('/api/v1') || url.endsWith('/api/v3') || url.endsWith('/api')) {
        url = url.replace(/\/$/, "").replace(/\/api\/v1$/, "").replace(/\/api\/v3$/, "").replace(/\/api$/, "");
    }
    return url;
};

const ROOT_URL = getRootUrl();
const V1_URL = `${ROOT_URL}/api/v1`;
const V3_URL = `${ROOT_URL}/api/v3`;

export const api = {
    coupons: {
        verify: async (code: string, subtotal: number) => {
            const res = await fetch(`${V1_URL}/coupons/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, subtotal })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Invalid coupon');
            }
            return res.json();
        },
        use: async (code: string) => {
            const res = await fetch(`${V1_URL}/coupons/use`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            return res.json();
        }
    },
    delivery: {
        getZones: async () => {
            try {
                const res = await fetch(`${V1_URL}/delivery`);
                if (!res.ok) throw new Error("Failed to fetch delivery zones");
                return res.json();
            } catch (error) {
                console.error("Delivery API failed, using static fallback:", error);
                return [
                    { name: 'Lagos', price: 3000 },
                    { name: 'Abuja', price: 4500 },
                    { name: 'Rivers', price: 5000 },
                    { name: 'Ogun', price: 3500 },
                    { name: 'Other States', price: 6000 }
                ];
            }
        }
    },
    orders: {
        create: async (data: any) => {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${V1_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
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
            const token = await auth.currentUser?.getIdToken();
            try {
                const res = await fetch(`${V3_URL}/resources`, {
                    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
                });
                if (!res.ok) throw new Error("Backend resources fetch failed");
                return await res.json();
            } catch (err) {
                console.error("Resources fetch failed:", err);
                return [];
            }
        }
    },
    products: {
        getAll: async () => {
            try {
                const res = await fetch(`${V3_URL}/products`);
                if (!res.ok) throw new Error("Backend products fetch failed");
                return await res.json();
            } catch (err) {
                console.error("Products fetch failed:", err);
                return [];
            }
        }
    },
    analytics: {
        logSession: async (sessionData: any) => {
            // Log to Backend V3 for aggregation
            try {
                fetch(`${V3_URL}/analytics/activity`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sessionData)
                }).catch(() => { });
            } catch (e) { }

            // Legacy Firestore logging for safety
            const ref = collection(db, 'analytics_sessions');
            await addDoc(ref, { ...sessionData, createdAt: new Date().toISOString() });

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
                        const today = new Date();
                        const dateKey = today.toLocaleString('default', { month: 'short', day: 'numeric' });
                        let monthly = [...(currentAnalytics.monthlyActivity || [])];
                        const dayIndex = monthly.findIndex((m: any) => m.date === dateKey);
                        if (dayIndex >= 0) {
                            monthly[dayIndex].hours += addedHours;
                        } else {
                            monthly.push({ date: dateKey, hours: addedHours });
                            if (monthly.length > 30) monthly.shift();
                        }

                        const monthName = today.toLocaleString('default', { month: 'short' });
                        let yearly = [...(currentAnalytics.yearlyActivity || [])];
                        const monthIndex = yearly.findIndex((y: any) => y.month === monthName);
                        if (monthIndex >= 0) {
                            yearly[monthIndex].hours += addedHours;
                        } else {
                            yearly.push({ month: monthName, hours: addedHours });
                        }

                        let newStreak = currentAnalytics.currentStreak || 0;
                        const lastDate = currentAnalytics.lastStudyDate ? new Date(currentAnalytics.lastStudyDate) : null;
                        const isSameDay = lastDate && lastDate.toDateString() === today.toDateString();

                        if (!isSameDay) {
                            const yesterday = new Date(today);
                            yesterday.setDate(today.getDate() - 1);
                            const isConsecutive = lastDate && lastDate.toDateString() === yesterday.toDateString();
                            newStreak = isConsecutive ? newStreak + 1 : 1;
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
                resourceId,
                userId,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        }
    }
};
