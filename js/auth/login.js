/* ===== AUTH LOGIN MODULE ===== */
window.KGL = window.KGL || {};

(function () {
    const redirectForRole = (role) => {
        const map = {
            manager: 'manager-dashboard.html',
            agent: 'agent-dashboard.html',
            director: 'director-dashboard.html',
            admin: 'manager-dashboard.html',
        };
        window.location.href = map[role] || 'login.html';
    };

    const parsePayload = (response) => {
        if (!response || !response.ok || !response.data) return null;
        return response.data.data || response.data;
    };

    const init = () => {
        const form = document.getElementById('loginForm');
        if (!form) return;
        const rememberMe = document.getElementById('rememberMe');

        const clearAuth = () => {
            localStorage.removeItem('kgl_auth');
            sessionStorage.removeItem('kgl_auth');
            localStorage.removeItem('kgl_user_role');
        };

        const verifyExistingSession = async () => {
            try {
                const verifyRes = await window.KGL.API.get('/auth/verify');
                const existing = parsePayload(verifyRes);
                if (!existing?.user?.role) throw new Error('Invalid session');
                const profile = { user: existing.user, loggedInAt: new Date().toISOString() };
                localStorage.setItem('kgl_auth', JSON.stringify(profile));
                sessionStorage.setItem('kgl_auth', JSON.stringify(profile));
                localStorage.setItem('kgl_user_role', existing.user.role);
                redirectForRole(existing.user.role);
                return true;
            } catch {
                clearAuth();
                return false;
            }
        };

        verifyExistingSession();

        const toggleBtn = document.querySelector('.toggle-password');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const input = document.getElementById('password');
                if (!input) return;
                input.type = input.type === 'password' ? 'text' : 'password';
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username')?.value?.trim() || '';
            const password = document.getElementById('password')?.value?.trim() || '';

            if (!username || !password) {
                window.KGL.Alerts.showError('Username and password are required');
                return;
            }

            try {
                window.KGL.Alerts.showLoading('Authenticating...');
                const response = await window.KGL.API.post(
                    '/auth/login',
                    { username, password },
                    { includeAuth: false }
                );
                const payload = parsePayload(response);
                if (!payload?.user?.role) throw new Error('Invalid login response');

                const authData = { user: payload.user, loggedInAt: new Date().toISOString() };
                const remember = Boolean(rememberMe?.checked);
                if (remember) {
                    localStorage.setItem('kgl_auth', JSON.stringify(authData));
                    sessionStorage.removeItem('kgl_auth');
                } else {
                    sessionStorage.setItem('kgl_auth', JSON.stringify(authData));
                    localStorage.removeItem('kgl_auth');
                }
                localStorage.setItem('kgl_user_role', payload.user.role);

                window.KGL.Alerts.hideLoading();
                window.KGL.Alerts.showSuccess('Login successful');
                setTimeout(() => redirectForRole(payload.user.role), 250);
            } catch (error) {
                window.KGL.Alerts.hideLoading();
                window.KGL.Alerts.showError(error.message || 'Login failed');
            }
        });
    };

    document.addEventListener('DOMContentLoaded', init);
})();
