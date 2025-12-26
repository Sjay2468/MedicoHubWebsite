import { auth, db } from '../firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, orderBy, limit, getDoc, setDoc } from 'firebase/firestore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://medico-hub-backend-0ufb.onrender.com/api/v1';
const V3_URL = BASE_URL.replace('/v1', '/v3');
console.log("[Admin API] Using Backend:", BASE_URL);

const getAuthHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

export const api = {
    resources: {
        getAll: async () => {
            try {
                const res = await fetch(`${V3_URL}/resources/admin/all`, {
                    headers: await getAuthHeaders()
                });
                if (!res.ok) throw new Error("Backend failed");
                return res.json();
            } catch (err) {
                console.error("Using Firestore fallback for resources:", err);
                const ref = collection(db, 'resources');
                const q = query(ref, orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        },
        create: async (data: any) => {
            const res = await fetch(`${V3_URL}/resources`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create resource");
            return res.json();
        },
        update: async (id: string, data: any) => {
            // Backend might not have PATCH for resources yet, fallback to Firestore if needed
            const ref = doc(db, 'resources', id);
            await updateDoc(ref, {
                ...data,
                updatedAt: new Date().toISOString()
            });
            return { id, ...data };
        },
        delete: async (id: string) => {
            const res = await fetch(`${V3_URL}/resources/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
            if (!res.ok) {
                // Fallback to direct Firestore delete
                const ref = doc(db, 'resources', id);
                await deleteDoc(ref);
            }
            return { success: true };
        }
    },
    users: {
        getAll: async () => {
            try {
                const response = await fetch(`${BASE_URL}/users?limit=100`, {
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
                if (!res.ok) throw new Error("Backend failed");
                return res.json();
            } catch (err) {
                console.error("Firestore fallback for products:", err);
                const ref = collection(db, 'products');
                const snapshot = await getDocs(ref);
                return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        },
        create: async (data: any) => {
            const res = await fetch(`${V3_URL}/products`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create product");
            return res.json();
        },
        update: async (id: string, data: any) => {
            const ref = doc(db, 'products', id);
            await updateDoc(ref, {
                ...data,
                updatedAt: new Date().toISOString()
            });
            return { id, ...data };
        },
        delete: async (id: string) => {
            const res = await fetch(`${V3_URL}/products/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
            if (!res.ok) {
                const ref = doc(db, 'products', id);
                await deleteDoc(ref);
            }
            return { success: true };
        }
    },
    coupons: {
        getAll: async () => {
            const res = await fetch(`${BASE_URL}/coupons`, {
                headers: await getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch coupons");
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${BASE_URL}/coupons`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create coupon");
            return res.json();
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
            if (!res.ok) throw new Error("Failed to fetch zones");
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${BASE_URL}/delivery`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return res.json();
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
            if (!res.ok) throw new Error("Failed to fetch orders");
            return res.json();
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
            if (!response.ok) throw new Error("Upload failed");
            const data = await response.json();
            return data.url;
        }
    }
};
