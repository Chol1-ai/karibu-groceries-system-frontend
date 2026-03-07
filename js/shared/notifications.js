/* ===== SHARED NOTIFICATIONS MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    const payload = (response) => response?.data?.data || response?.data || null;
    const badgeEls = () => ({
        header: document.getElementById('headerNotificationsBadge'),
        sidebar: document.getElementById('sidebarNotificationsBadge')
    });

    const setBadges = (count) => {
        const safe = Math.max(Number(count || 0), 0);
        const { header, sidebar } = badgeEls();
        [header, sidebar].forEach((el) => {
            if (!el) return;
            el.textContent = String(safe);
            el.style.display = safe > 0 ? 'inline-flex' : 'none';
        });
    };

    const refreshUnreadCount = async () => {
        try {
            const res = await window.KGL.API.get('/notifications');
            const data = payload(res) || {};
            setBadges(data.unreadCount || 0);
        } catch {
            // Silent failure to avoid noisy UI.
        }
    };

    const openPanel = async () => {
        try {
            const res = await window.KGL.API.get('/notifications/unread', { limit: 50 });
            const rows = payload(res) || [];
            const msg = rows.map((n) => `- ${n.message}`).join('\n') || 'No notifications';
            await window.KGL.Alerts.showAlert({ title: 'Notifications', message: msg });
            if (rows.length > 0) await window.KGL.API.post('/notifications/read-all', {});
            setBadges(0);
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to load notifications');
        }
    };

    window.KGL.Notifications = { openPanel, refreshUnreadCount };
})();

