import { auth, db } from '../firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, orderBy, limit, getDoc, setDoc } from 'firebase/firestore';

// Robust URL Handling: Ensure we have the correct base for v1 and v3
const getRootUrl = () => {
    let url = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://medico-backend-06fb.onrender.com';

    // 1. Force strings and trim
    url = String(url).trim();

    // 2. Remove any /api/v1, /api/v3 or trailing slashes at the end
    // Use a loop to handle cases like /api/v1/
    while (url.endsWith('/') || url.endsWith('/api/v1') || url.endsWith('/api/v3') || url.endsWith('/api')) {
        url = url.replace(/\/$/, "")
            .replace(/\/api\/v1$/, "")
            .replace(/\/api\/v3$/, "")
            .replace(/\/api$/, "");
    }

    // 3. Ensure Protocol: If we are on HTTPS, the API MUST be HTTPS
    if (window.location.protocol === 'https:' && url.startsWith('http:')) {
        console.warn("[Admin API] Detected Mixed Content: Upgrading insecure API URL to HTTPS.");
        url = url.replace('http:', 'https:');
    }

    return url;
};

const ROOT_URL = getRootUrl();
const BASE_URL = `${ROOT_URL}/api/v1`;
const V3_URL = `${ROOT_URL}/api/v3`;

console.log("%c[Admin API] Initialized Settings", "color: #0066FF; font-weight: bold; font-size: 12px;");
console.log("Root:", ROOT_URL);
console.log("V1:", BASE_URL);
console.log("V3:", V3_URL);

if (ROOT_URL.includes('localhost') && window.location.hostname !== 'localhost') {
    console.warn("[Admin API] Possible Configuration Error: You are on a live site but VITE_API_URL is pointing to localhost!");
}

const getAuthHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        let errorMsg = "API Error";
        try {
            const data = await res.json();
            errorMsg = data.error || data.message || `Server responded with ${res.status}`;
        } catch (e) {
            errorMsg = await res.text() || `Server responded with ${res.status}`;
        }
        console.error("[API Error Details]", errorMsg);
        throw new Error(errorMsg);
    }
    return res.json();
};

export const api = {
    resources: {
        getAll: async () => {
            try {
                const res = await fetch(`${V3_URL}/resources/admin/all`, {
                    headers: await getAuthHeaders()
                });
                if (!res.ok) throw new Error("Backend resources fetch failed");
                return await res.json();
            } catch (err) {
                console.error("Resources fetch failed:", err);
                return [];
            }
        },
        create: async (data: any) => {
            const res = await fetch(`${V3_URL}/resources`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${V3_URL}/resources/${id}`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update resource on backend");
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${V3_URL}/resources/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to delete resource on backend");
            return res.json();
        }
    },
    users: {
        getAll: async () => {
            try {
                const response = await fetch(`${BASE_URL}/users?limit=200`, {
                    headers: await getAuthHeaders()
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Backend fetch failed: ${response.status} ${errorText}`);
                }

                const data = await response.json();
                return Array.isArray(data) ? data : (data.users || []);
            } catch (err) {
                console.error("Firestore fallback for users:", err);
                const ref = collection(db, 'users');
                const q = query(ref, orderBy('createdAt', 'desc'), limit(100));
                const snap = await getDocs(q);
                return snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
            }
        },
        getUpgradeRequests: async () => {
            try {
                const response = await fetch(`${BASE_URL}/users?filter=requests&limit=50`, {
                    headers: await getAuthHeaders()
                });
                return handleResponse(response);
            } catch (err) {
                // Fallback: manually filter from a bigger set or just fetch direct
                const ref = collection(db, 'users');
                const q = query(ref, orderBy('createdAt', 'desc'), limit(200));
                const snap = await getDocs(q);
                return snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }))
                    .filter((u: any) => !!u.requestedYear);
            }
        },
        getRecent: async (count = 5) => {
            try {
                const response = await fetch(`${BASE_URL}/users?limit=${count}`, {
                    headers: await getAuthHeaders()
                });
                if (!response.ok) throw new Error("Backend failed");
                const data = await response.json();
                return Array.isArray(data) ? data : (data.users || []);
            } catch (err) {
                const ref = collection(db, 'users');
                const q = query(ref, orderBy('createdAt', 'desc'), limit(count));
                const snap = await getDocs(q);
                return snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
            }
        },
        update: async (uid: string, data: any) => {
            const ref = doc(db, 'users', uid);
            await updateDoc(ref, {
                ...data,
                updatedAt: new Date().toISOString()
            });
            return { uid, ...data };
        },
        delete: async (uid: string) => {
            try {
                const response = await fetch(`${BASE_URL}/users/${uid}`, {
                    method: 'DELETE',
                    headers: await getAuthHeaders()
                });

                if (!response.ok) throw new Error("Failed to delete user via backend");

                await deleteDoc(doc(db, 'users', uid));
                return { success: true };
            } catch (err) {
                console.error("Delete fallback:", err);
                await deleteDoc(doc(db, 'users', uid));
                return { success: true };
            }
        }
    },
    products: {
        getAll: async () => {
            try {
                const res = await fetch(`${V3_URL}/products`, {
                    headers: await getAuthHeaders()
                });
                if (!res.ok) throw new Error("Backend products fetch failed");
                return await res.json();
            } catch (err) {
                console.error("Products fetch failed:", err);
                return [];
            }
        },
        create: async (data: any) => {
            const res = await fetch(`${V3_URL}/products`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${V3_URL}/products/${id}`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update product on backend");
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${V3_URL}/products/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to delete product on backend");
            return res.json();
        }
    },
    coupons: {
        getAll: async () => {
            const res = await fetch(`${BASE_URL}/coupons`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        },
        create: async (data: any) => {
            const res = await fetch(`${BASE_URL}/coupons`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        delete: async (id: string) => {
            const res = await fetch(`${BASE_URL}/coupons/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to delete coupon");
            return res.json();
        },
        toggle: async (id: string) => {
            const res = await fetch(`${BASE_URL}/coupons/${id}/toggle`, {
                method: 'PATCH',
                headers: await getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to toggle coupon");
            return res.json();
        }
    },
    delivery: {
        getAll: async () => {
            const res = await fetch(`${BASE_URL}/delivery/admin`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        },
        create: async (data: any) => {
            const res = await fetch(`${BASE_URL}/delivery`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${BASE_URL}/delivery/${id}`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            await fetch(`${BASE_URL}/delivery/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
        }
    },
    orders: {
        getAll: async () => {
            const res = await fetch(`${BASE_URL}/orders`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        },
        updateStatus: async (id: string, status: string) => {
            const res = await fetch(`${BASE_URL}/orders/${id}/status`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify({ status })
            });
            return res.json();
        }
    },
    stats: {
        getCounts: async () => {
            const usersRef = collection(db, 'users');
            const resRef = collection(db, 'resources');
            const prodRef = collection(db, 'products');
            const [users, localRes, products] = await Promise.all([
                getDocs(usersRef),
                getDocs(resRef),
                getDocs(prodRef)
            ]);
            return { users: users.size, resources: localRes.size, products: products.size };
        },
        getGlobal: async (days = 30) => {
            const res = await fetch(`${BASE_URL}/analytics/admin/global?days=${days}`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        }
    },
    settings: {
        get: async () => {
            const ref = doc(db, 'settings', 'config');
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() : { maintenanceMode: false, allowSignups: true, announcement: '' };
        },
        update: async (data: any) => {
            const ref = doc(db, 'settings', 'config');
            await setDoc(ref, data, { merge: true });
            return data;
        }
    },
    notifications: {
        broadcast: async (data: any) => {
            const ref = collection(db, 'notifications');
            await addDoc(ref, {
                target: 'all',
                ...data,
                createdAt: new Date().toISOString(),
                readBy: []
            });
        },
        sendToUser: async (userId: string, data: any) => {
            const ref = collection(db, 'notifications');
            await addDoc(ref, {
                target: userId,
                ...data,
                createdAt: new Date().toISOString(),
                read: false
            });
        }
    },
    files: {
        upload: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const headers: any = await getAuthHeaders();
            delete headers['Content-Type']; // Let browser set boundary
            const response = await fetch(`${BASE_URL}/upload`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            const data = await handleResponse(response);
            return data.url;
        }
    }
};
