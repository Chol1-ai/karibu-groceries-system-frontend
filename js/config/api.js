/* ===== API CLIENT CONFIG ===== */
window.KGL = window.KGL || {};

(function () {
    /* ===== API CONFIG STATE ===== */
    const API_CONFIG = {
        BASE_URL: null,
        resolveBaseUrl: async function () {
            if (this.BASE_URL) return this.BASE_URL;
            const host = window.location.hostname || '127.0.0.1';
            const runtimeBase = String(window.KGL_API_BASE_URL || '').trim();
            const customBase = localStorage.getItem('kgl_api_base_url');
            const forcedPort = localStorage.getItem('kgl_api_port');
            const isHttpPage = /^https?:$/.test(window.location.protocol);

            if (runtimeBase) {
                this.BASE_URL = runtimeBase.replace(/\/+$/, '');
                return this.BASE_URL;
            }

            if (customBase) {
                this.BASE_URL = customBase.replace(/\/+$/, '');
                return this.BASE_URL;
            }

            if (isHttpPage && !forcedPort) {
                this.BASE_URL = `${window.location.origin}/api/v1`;
                return this.BASE_URL;
            }

            const port = forcedPort || '3000';
            const protocol = isHttpPage ? window.location.protocol : 'http:';
            this.BASE_URL = `${protocol}//${host}:${port}/api/v1`;
            return this.BASE_URL;
        },
        getToken: function () {
            const raw = localStorage.getItem('kgl_auth') || sessionStorage.getItem('kgl_auth');
            if (!raw) return null;
            try {
                return JSON.parse(raw).token || null;
            } catch {
                return null;
            }
        },
        getCurrentUser: function () {
            const raw = localStorage.getItem('kgl_auth') || sessionStorage.getItem('kgl_auth');
            if (!raw) return null;
            try {
                return JSON.parse(raw).user || null;
            } catch {
                return null;
            }
        },
        clearAuth: function () {
            localStorage.removeItem('kgl_auth');
            sessionStorage.removeItem('kgl_auth');
            localStorage.removeItem('kgl_user_role');
        },
        isAuthenticated: function () {
            const raw = localStorage.getItem('kgl_auth') || sessionStorage.getItem('kgl_auth');
            return Boolean(raw);
        },
    };

    /* ===== QUERY SERIALIZATION ===== */
    const toQuery = (params) => {
        const entries = Object.entries(params || {}).filter(
            ([, v]) => v !== undefined && v !== null && v !== ''
        );
        if (!entries.length) return '';
        return `?${new URLSearchParams(entries).toString()}`;
    };

    /* ===== CORE HTTP REQUEST ===== */
    const apiRequest = async (endpoint, options = {}) => {
        const baseUrl = await API_CONFIG.resolveBaseUrl();
        const url = `${baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(options.headers || {}),
        };

        let response;
        try {
            response = await fetch(url, {
                method: options.method || 'GET',
                headers,
                body: options.body,
                credentials: 'include',
            });
        } catch (error) {
            throw new Error(
                `Cannot reach backend at ${baseUrl}. Ensure the API is running or set localStorage kgl_api_base_url/kgl_api_port.`
            );
        }

        let data = null;
        const type = response.headers.get('content-type') || '';
        if (type.includes('application/json')) data = await response.json();
        else data = await response.text();

        if (response.status === 401 && options.includeAuth !== false) {
            API_CONFIG.clearAuth();
            document.dispatchEvent(new CustomEvent('api:unauthorized'));
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
            throw new Error('Session expired. Please login again.');
        }

        if (!response.ok) {
            throw new Error(data?.message || `Request failed (${response.status})`);
        }

        return { ok: true, status: response.status, data };
    };

    /* ===== PUBLIC HTTP METHODS ===== */
    const api = {
        get: (endpoint, params = {}, options = {}) =>
            apiRequest(`${endpoint}${toQuery(params)}`, { ...options, method: 'GET' }),
        post: (endpoint, payload = {}, options = {}) =>
            apiRequest(endpoint, { ...options, method: 'POST', body: JSON.stringify(payload) }),
        put: (endpoint, payload = {}, options = {}) =>
            apiRequest(endpoint, { ...options, method: 'PUT', body: JSON.stringify(payload) }),
        patch: (endpoint, payload = {}, options = {}) =>
            apiRequest(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(payload) }),
        delete: (endpoint, options = {}) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
        download: async (endpoint, filename = 'report.txt', options = {}) => {
            const baseUrl = await API_CONFIG.resolveBaseUrl();
            const url = `${baseUrl}${endpoint}${toQuery(options.params || {})}`;
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error(`Download failed (${res.status})`);
            const blob = await res.blob();
            const link = document.createElement('a');
            const blobUrl = URL.createObjectURL(blob);
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(blobUrl);
            return { ok: true };
        },
    };

    window.KGL.API = { config: API_CONFIG, ...api };
})();

