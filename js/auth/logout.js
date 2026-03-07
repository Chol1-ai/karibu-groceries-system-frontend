/* ===== AUTH LOGOUT MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    const clearAuth = () => {
        localStorage.removeItem('kgl_auth');
        sessionStorage.removeItem('kgl_auth');
        localStorage.removeItem('kgl_user_role');
    };

    const bind = () => {
        document.querySelectorAll('[data-page="logout"], [data-action="logout"]').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await window.KGL.API.post('/auth/logout', {}, { includeAuth: false });
                } catch {
                    // Ignore network/auth errors on logout.
                }
                clearAuth();
                window.location.href = 'login.html';
            });
        });
    };

    document.addEventListener('DOMContentLoaded', bind);
    document.addEventListener('api:unauthorized', () => {
        clearAuth();
        window.location.href = 'login.html';
    });
})();

