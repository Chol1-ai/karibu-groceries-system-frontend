/* ===== SHARED SIDEBAR MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    const setActive = (page) => {
        document.querySelectorAll('.nav-item').forEach((item) => {
            item.classList.toggle('active', item.dataset.page === page);
        });
    };

    const bind = () => {
        const sidebar = document.querySelector('.sidebar');
        const container = document.querySelector('.dashboard-container');
        const toggle = document.getElementById('menuToggle');
        if (toggle && sidebar && container) {
            toggle.addEventListener('click', () => {
                const isMobile = window.matchMedia('(max-width: 1024px)').matches;
                if (isMobile) {
                    sidebar.classList.toggle('active');
                    return;
                }
                container.classList.toggle('sidebar-collapsed');
            });
        }

        document.querySelectorAll('.nav-item').forEach((item) => {
            item.addEventListener('click', (e) => {
                if (item.dataset.page === 'logout') return;
                e.preventDefault();
                const page = item.dataset.page;
                setActive(page);
                if (window.matchMedia('(max-width: 1024px)').matches) {
                    sidebar?.classList.remove('active');
                }
                document.dispatchEvent(new CustomEvent('navigation:changed', { detail: { page } }));
            });
        });
    };

    document.addEventListener('DOMContentLoaded', bind);
    window.KGL.Sidebar = { setActive };
})();

