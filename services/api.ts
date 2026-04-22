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

const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    return fetch(input, {
        ...init,
        credentials: 'include',
        headers: init.headers as HeadersInit | undefined
    });
};

const readResponseBody = async (res: Response) => {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (!text) return null;
    if (contentType.includes('application/json')) {
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const getCsrfToken = async () => {
    const res = await apiFetch(`${ROOT_URL}/auth/csrf`);
    const data = await readResponseBody(res);
    return data?.csrfToken as string | undefined;
};

export const api = {
    coupons: {
        verify: async (code: string, subtotal: number) => {
            const res = await apiFetch(`${V1_URL}/coupons/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, subtotal })
            });
            if (!res.ok) {
                const err = await readResponseBody(res);
                throw new Error(err.error || 'Invalid coupon');
            }
            return readResponseBody(res);
        },
        use: async (code: string) => {
            const res = await apiFetch(`${V1_URL}/coupons/use`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            return readResponseBody(res);
        }
    },
    auth: {
        session: async () => {
            const res = await apiFetch(`${V1_URL}/auth/session`);
            if (!res.ok) return null;
            return readResponseBody(res);
        },
        register: async (name: string, email: string, password: string) => {
            const res = await apiFetch(`${V1_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            return readResponseBody(res);
        },
        login: async (email: string, password: string) => {
            const csrfToken = await getCsrfToken();
            const body = new URLSearchParams({
                csrfToken: csrfToken || '',
                email,
                password,
                redirect: 'false',
                json: 'true',
                callbackUrl: window.location.href
            });
            const res = await apiFetch(`${ROOT_URL}/auth/callback/credentials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            return { ok: res.ok, status: res.status, data: await readResponseBody(res) };
        },
        googleSignIn: () => {
            window.location.href = `${ROOT_URL}/auth/signin/google?callbackUrl=${encodeURIComponent(window.location.href)}`;
        },
        logout: async () => {
            const csrfToken = await getCsrfToken();
            const body = new URLSearchParams({
                csrfToken: csrfToken || '',
                callbackUrl: window.location.href,
                json: 'true'
            });
            const res = await apiFetch(`${ROOT_URL}/auth/signout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            return { ok: res.ok, status: res.status, data: await readResponseBody(res) };
        },
        sendVerification: async (email: string) => {
            const res = await apiFetch(`${V1_URL}/auth/request-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (!res.ok) {
                const err = await readResponseBody(res);
                throw new Error(err.error || 'Failed to send verification email');
            }
            return readResponseBody(res);
        },
        sendReset: async (email: string) => {
            const res = await apiFetch(`${V1_URL}/auth/request-reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (!res.ok) {
                const err = await readResponseBody(res);
                throw new Error(err.error || 'Failed to send password reset email');
            }
            return readResponseBody(res);
        },
        verifyEmail: async (token: string) => {
            const res = await apiFetch(`${V1_URL}/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            return readResponseBody(res);
        },
        resetPassword: async (token: string, password: string) => {
            const res = await apiFetch(`${V1_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            return readResponseBody(res);
        }
    },
    delivery: {
        getZones: async () => {
            try {
                const res = await apiFetch(`${V1_URL}/delivery`);
                if (!res.ok) throw new Error("Failed to fetch delivery zones");
                return readResponseBody(res);
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
            const res = await apiFetch(`${V1_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
                if (!res.ok) {
                    const errData = await readResponseBody(res) || {};
                    throw new Error(errData.error || errData.message || "Order creation failed");
                }
            return readResponseBody(res);
        }
    },
    resources: {
        getAll: async () => {
            try {
                const res = await apiFetch(`${V3_URL}/resources`, {
                    headers: { 'Content-Type': 'application/json' }
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
                const res = await apiFetch(`${V3_URL}/products`);
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
                const res = await apiFetch(`${V1_URL}/analytics/activity`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sessionData)
                });
                if (!res.ok) console.warn("Log activity to V1 failed");
            } catch (e) {
                console.error("Failed to log activity", e);
            }

            // Also update the User's direct analytics in MongoDB via the API
            if (sessionData.userId && sessionData.durationSeconds) {
                try {
                    const userData = await api.users.get(sessionData.userId);
                    if (userData) {
                        const currentAnalytics = userData.analytics || {
                            totalHours: 0,
                            streakDays: 0,
                            monthlyActivity: []
                        };

                        const addedHours = sessionData.durationSeconds / 3600;
                        const newTotal = (currentAnalytics.totalHours || 0) + addedHours;

                        // We'll let the backend handle the complex aggregation logic 
                        // if we want to be clean, but for now we'll send the incremental update
                        await api.users.update(sessionData.userId, {
                            analytics: {
                                ...currentAnalytics,
                                totalHours: newTotal,
                                lastStudyDate: new Date().toISOString()
                            }
                        });
                    }
                } catch (err) {
                    console.error("Local analytics update failed:", err);
                }
            }
            return { success: true };
        },
        getUserProgress: async (userId: string) => {
            try {
                const userData = await api.users.get(userId);
                if (userData && userData.resourceProgress) {
                    return Object.entries(userData.resourceProgress).map(([id, data]: [string, any]) => ({
                        resourceId: id,
                        ...data
                    })) as ResourceProgress[];
                }
                return [] as ResourceProgress[];
            } catch (e) {
                console.error("Failed to fetch user progress from MongoDB", e);
                return [] as ResourceProgress[];
            }
        },
        updateResourceProgress: async (userId: string, resourceId: string, progressData: Partial<ResourceProgress>) => {
            // Push to MongoDB via general profile update or specific progress endpoint
            try {
                const userData = await api.users.get(userId);
                const progress = userData.resourceProgress || {};
                progress[resourceId] = {
                    ...progress[resourceId],
                    ...progressData,
                    lastUpdated: new Date().toISOString()
                };
                await api.users.update(userId, { resourceProgress: progress });
            } catch (e) {
                console.error("Failed to update resource progress in MongoDB", e);
            }
        },
    }, users: {
        get: async (uid: string) => {
            const res = await apiFetch(`${V1_URL}/users/${uid}/profile`, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error("Failed to fetch user profile from MongoDB");
            const data = await res.json();
            return data.user;
        },
        update: async (uid: string, data: any) => {
            const res = await apiFetch(`${V1_URL}/users/${uid}/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update user profile in MongoDB");
            return res.json();
        },
        delete: async (uid: string) => {
            const res = await apiFetch(`${V1_URL}/users/${uid}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error("Failed to delete user profile from MongoDB");
            return res.json();
        }
    },
    notifications: {
        get: async () => {
            const res = await apiFetch(`${V1_URL}/notifications`, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error("Failed to fetch notifications from MongoDB");
            return res.json();
        },
        markAsRead: async (id: string) => {
            const res = await apiFetch(`${V1_URL}/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error("Failed to mark notification as read in MongoDB");
            return res.json();
        },
        broadcast: async (data: any) => {
            const res = await apiFetch(`${V1_URL}/notifications/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Broadcast failed in MongoDB");
            return res.json();
        }
    },
    settings: {
        get: async () => {
            const res = await apiFetch(`${V1_URL}/settings`);
            if (!res.ok) throw new Error("Failed to fetch settings from MongoDB");
            return res.json();
        }
    },
    curriculum: {
        get: async (year?: string) => {
            const query = year ? `?year=${encodeURIComponent(year)}` : '';
            const res = await apiFetch(`${V1_URL}/curriculum${query}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error("Failed to fetch curriculum from MongoDB");
            return res.json();
        }
    }
};
