import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, orderBy, limit, getDoc, setDoc } from 'firebase/firestore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const api = {
    resources: {
        getAll: async () => {
            const ref = collection(db, 'resources');
            const q = query(ref, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        create: async (data: any) => {
            const ref = collection(db, 'resources');
            const newDoc = await addDoc(ref, {
                ...data,
                createdAt: new Date().toISOString()
            });
            return { id: newDoc.id, ...data };
        },
        update: async (id: string, data: any) => {
            const ref = doc(db, 'resources', id);
            await updateDoc(ref, {
                ...data,
                updatedAt: new Date().toISOString()
            });
            return { id, ...data };
        },
        delete: async (id: string) => {
            const ref = doc(db, 'resources', id);
            await deleteDoc(ref);
            return { success: true };
        }
    },
    users: {
        getAll: async () => {
            try {
                const { auth } = await import('../firebase');
                const token = await auth.currentUser?.getIdToken(true);
                if (!token) throw new Error("Not authenticated");

                const response = await fetch(`${BASE_URL}/users?limit=100`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Backend fetch failed: ${response.status} ${errorText}`);
                }

                return await response.json();
            } catch (e: any) {
                console.error("API Error fetching users:", e);
                try {
                    const ref = collection(db, 'users');
                    const q = query(ref, orderBy('createdAt', 'desc'));
                    const snapshot = await getDocs(q);
                    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                } catch (fallbackError) {
                    throw e;
                }
            }
        },
        getRecent: async (limitCount = 5) => {
            const ref = collection(db, 'users');
            const q = query(ref, orderBy('createdAt', 'desc'), limit(limitCount));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
                const { auth } = await import('../firebase');
                const token = await auth.currentUser?.getIdToken();

                if (!token) throw new Error("Not authenticated");

                const response = await fetch(`${BASE_URL}/users/${uid}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error("Failed to delete user via backend");
                return { success: true };
            } catch (err) {
                const ref = doc(db, 'users', uid);
                await deleteDoc(ref);
                return { success: true };
            }
        }
    },
    products: {
        getAll: async () => {
            const ref = collection(db, 'products');
            const snapshot = await getDocs(ref);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        },
        create: async (data: any) => {
            const ref = collection(db, 'products');
            const newDoc = await addDoc(ref, {
                ...data,
                createdAt: new Date().toISOString()
            });
            return { id: newDoc.id, ...data };
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
            const ref = doc(db, 'products', id);
            await deleteDoc(ref);
            return { success: true };
        }
    },
    coupons: {
        getAll: async () => {
            const res = await fetch(`${BASE_URL}/coupons`);
            if (!res.ok) throw new Error("Failed to fetch coupons");
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${BASE_URL}/coupons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to create coupon");
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${BASE_URL}/coupons/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete coupon");
            return res.json();
        },
        toggle: async (id: string) => {
            const res = await fetch(`${BASE_URL}/coupons/${id}/toggle`, { method: 'PATCH' });
            if (!res.ok) throw new Error("Failed to toggle coupon");
            return res.json();
        }
    },
    delivery: {
        getAll: async () => {
            const res = await fetch(`${BASE_URL}/delivery/admin`);
            if (!res.ok) throw new Error("Failed to fetch zones");
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch(`${BASE_URL}/delivery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        },
        update: async (id: string, data: any) => {
            const res = await fetch(`${BASE_URL}/delivery/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        },
        delete: async (id: string) => {
            await fetch(`${BASE_URL}/delivery/${id}`, { method: 'DELETE' });
        }
    },
    orders: {
        getAll: async () => {
            const res = await fetch(`${BASE_URL}/orders`);
            if (!res.ok) throw new Error("Failed to fetch orders");
            return res.json();
        },
        updateStatus: async (id: string, status: string) => {
            const res = await fetch(`${BASE_URL}/orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
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
            const response = await fetch(`${BASE_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) throw new Error("Upload failed");
            const data = await response.json();
            return data.url;
        }
    }
};
