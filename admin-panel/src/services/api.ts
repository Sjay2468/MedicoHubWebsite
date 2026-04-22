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
    return {
        'Content-Type': 'application/json'
    };
};

const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    return fetch(input, {
        ...init,
        credentials: 'include',
        headers: init.headers as HeadersInit | undefined
    });
};

const getCsrfToken = async () => {
    const res = await apiFetch(`${ROOT_URL}/auth/csrf`);
    const data = await readResponseBody(res);
    return data?.csrfToken as string | undefined;
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

const handleResponse = async (res: Response) => {
    const body = await readResponseBody(res);

    if (!res.ok) {
        const errorMsg =
            (body && typeof body === 'object' && (body.error || body.message)) ||
            (typeof body === 'string' && body) ||
            `Server responded with ${res.status}`;
        console.error("[API Error Details]", errorMsg);
        throw new Error(errorMsg);
    }

    return body;
};

export const api = {
    auth: {
        session: async () => {
            const res = await apiFetch(`${BASE_URL}/auth/session`);
            if (!res.ok) return null;
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
        googleSignIn: () => {
            window.location.href = `${ROOT_URL}/auth/signin/google?callbackUrl=${encodeURIComponent(window.location.href)}`;
        },
        requestReset: async (email: string) => {
            const res = await apiFetch(`${BASE_URL}/auth/request-reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            return readResponseBody(res);
        },
        requestVerification: async (email: string) => {
            const res = await apiFetch(`${BASE_URL}/auth/request-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            return readResponseBody(res);
        },
        verifyEmail: async (token: string) => {
            const res = await apiFetch(`${BASE_URL}/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            return readResponseBody(res);
        },
        resetPassword: async (token: string, password: string) => {
            const res = await apiFetch(`${BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            return readResponseBody(res);
        }
    },
    resources: {
        getAll: async () => {
            try {
                const res = await apiFetch(`${V3_URL}/resources/admin/all`, {
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
            const res = await apiFetch(`${V3_URL}/resources`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        update: async (id: string, data: any) => {
            const res = await apiFetch(`${V3_URL}/resources/${id}`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        delete: async (id: string) => {
            const res = await apiFetch(`${V3_URL}/resources/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        }
    },
    users: {
        getAll: async () => {
            const url = `${BASE_URL}/users?limit=200`;
            try {
                const response = await apiFetch(url, {
                    headers: await getAuthHeaders()
                });

                const data = await handleResponse(response);
                // const data = await response.json();
                return Array.isArray(data) ? data : (data.users || []);
            } catch (err: any) {
                console.error(`[API] Failed to fetch users from ${url}`, err);
                throw new Error(`Connection failed to ${url}: ${err.message || 'Unknown Error'}`);
            }
        },
        getUpgradeRequests: async () => {
            const response = await apiFetch(`${BASE_URL}/users?filter=requests&limit=50`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(response);
        },
        getRecent: async (count = 5) => {
            const response = await apiFetch(`${BASE_URL}/users?limit=${count}`, {
                headers: await getAuthHeaders()
            });
            if (!response.ok) throw new Error("Backend failed");
            const data = await response.json();
            return Array.isArray(data) ? data : (data.users || []);
        },
        get: async (uid: string) => {
            const res = await apiFetch(`${BASE_URL}/users/${uid}/profile`, {
                headers: await getAuthHeaders()
            });
            const data = await handleResponse(res);
            return data.user;
        },
        update: async (uid: string, data: any) => {
            const res = await apiFetch(`${BASE_URL}/users/${uid}/profile`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        delete: async (uid: string) => {
            const response = await apiFetch(`${BASE_URL}/users/${uid}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });

            if (!response.ok) throw new Error("Failed to delete user via backend");
            return { success: true };
        }
    },
    products: {
        getAll: async () => {
            try {
                const res = await apiFetch(`${V3_URL}/products`, {
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
            const res = await apiFetch(`${V3_URL}/products`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        update: async (id: string, data: any) => {
            const res = await apiFetch(`${V3_URL}/products/${id}`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        delete: async (id: string) => {
            const res = await apiFetch(`${V3_URL}/products/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        }
    },
    coupons: {
        getAll: async () => {
            const res = await apiFetch(`${BASE_URL}/coupons`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        },
        create: async (data: any) => {
            const res = await apiFetch(`${BASE_URL}/coupons`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        delete: async (id: string) => {
            const res = await apiFetch(`${BASE_URL}/coupons/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        },
        toggle: async (id: string) => {
            const res = await apiFetch(`${BASE_URL}/coupons/${id}/toggle`, {
                method: 'PATCH',
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        }
    },
    delivery: {
        getAll: async () => {
            const res = await apiFetch(`${BASE_URL}/delivery/admin`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        },
        create: async (data: any) => {
            const res = await apiFetch(`${BASE_URL}/delivery`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        update: async (id: string, data: any) => {
            const res = await apiFetch(`${BASE_URL}/delivery/${id}`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        delete: async (id: string) => {
            await apiFetch(`${BASE_URL}/delivery/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
        }
    },
    orders: {
        getAll: async () => {
            const res = await apiFetch(`${BASE_URL}/orders`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        },
        updateStatus: async (id: string, status: string) => {
            const res = await apiFetch(`${BASE_URL}/orders/${id}/status`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify({ status })
            });
            return res.json();
        }
    },
    stats: {
        getCounts: async () => {
            const res = await apiFetch(`${BASE_URL}/analytics/admin/counts`, {
                headers: await getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch counts from MongoDB");
            return res.json();
        },
        getGlobal: async (days = 30) => {
            const res = await apiFetch(`${BASE_URL}/analytics/admin/global?days=${days}`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        }
    },
    settings: {
        get: async () => {
            const res = await apiFetch(`${BASE_URL}/settings`, {
                headers: await getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch settings from MongoDB");
            return res.json();
        },
        update: async (data: any) => {
            const res = await apiFetch(`${BASE_URL}/settings`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update settings in MongoDB");
            return res.json();
        }
    },
    notifications: {
        broadcast: async (data: any) => {
            const res = await apiFetch(`${BASE_URL}/notifications/broadcast`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Broadcast failed in MongoDB");
            return res.json();
        },
        sendToUser: async (userId: string, data: any) => {
            return api.notifications.broadcast({
                target: userId,
                ...data
            });
        }
    },
    files: {
        upload: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const headers: any = await getAuthHeaders();
            delete headers['Content-Type']; // Let browser set boundary
            const response = await apiFetch(`${BASE_URL}/upload`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            const data = await handleResponse(response);
            return data.url;
        }
    },
    curriculum: {
        get: async () => {
            const res = await apiFetch(`${BASE_URL}/curriculum`, {
                headers: await getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch curriculum");
            const data = await res.json();
            return data;
        },
        update: async (data: any) => {
            const res = await apiFetch(`${BASE_URL}/curriculum`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to update curriculum");
            const result = await res.json();
            return result;
        }
    },
    cohorts: {
        getAll: async () => {
            const res = await apiFetch(`${BASE_URL}/cohorts`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        },
        get: async (id: string) => {
            const res = await apiFetch(`${BASE_URL}/cohorts/${id}`, {
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        },
        create: async (data: any) => {
            const res = await apiFetch(`${BASE_URL}/cohorts`, {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        update: async (id: string, data: any) => {
            const res = await apiFetch(`${BASE_URL}/cohorts/${id}`, {
                method: 'PATCH',
                headers: await getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        delete: async (id: string) => {
            const res = await apiFetch(`${BASE_URL}/cohorts/${id}`, {
                method: 'DELETE',
                headers: await getAuthHeaders()
            });
            return handleResponse(res);
        }
    }
};
