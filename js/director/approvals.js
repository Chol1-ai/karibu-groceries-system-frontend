/* ===== DIRECTOR APPROVALS MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    const payload = (response) => response?.data?.data || response?.data || null;
    let modal = null;

    const ensureModal = () => {
        if (modal) return modal;
        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;top:86px;right:20px;display:none;z-index:26040;';
        host.innerHTML = `
            <div style="width:min(560px,90vw);max-height:78vh;overflow:auto;background:#f8fbff;border:1px solid #d4deea;border-radius:12px;box-shadow:0 14px 28px rgba(2,10,25,.22);font-family:Inter,system-ui;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#fff;border-bottom:1px solid #dde6f2;">
                    <h3 style="margin:0;font:700 17px Inter,system-ui;color:#102a4d;">Password Change Requests</h3>
                    <button id="kgl-req-close" type="button" style="border:none;background:transparent;font-size:18px;color:#5d7593;cursor:pointer;">x</button>
                </div>
                <div id="kgl-req-list" style="padding:10px 12px;display:grid;gap:8px;"></div>
                <div style="display:flex;justify-content:flex-end;padding:8px 12px;background:#fff;border-top:1px solid #dde6f2;">
                    <button id="kgl-req-refresh" type="button" style="background:#fff;color:#1e3552;border:1px solid #c9d6e4;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Refresh</button>
                </div>
            </div>
        `;
        document.body.appendChild(host);
        modal = host;
        return modal;
    };

    const render = (rows = []) => {
        const list = modal?.querySelector('#kgl-req-list');
        if (!list) return;
        if (!rows.length) {
            list.innerHTML = '<div style="padding:10px;border:1px solid #dfe8f3;border-radius:8px;background:#fff;color:#335274;font-size:13px;">No pending password requests.</div>';
            return;
        }
        list.innerHTML = rows.map((r) => `
            <div data-id="${r._id}" style="border:1px solid #dfe8f3;border-radius:8px;background:#fff;padding:10px;display:grid;gap:8px;">
                <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;font-size:12px;">
                    <strong style="color:#1f3a5a;">Requester</strong><span>${r.requester?.name || r.requestedBy || '-'}</span>
                    <strong style="color:#1f3a5a;">Role</strong><span>${r.requester?.role || '-'}</span>
                    <strong style="color:#1f3a5a;">Submitted</strong><span>${window.KGL.Formatting.formatDateTime(r.createdAt)}</span>
                    <strong style="color:#1f3a5a;">Reason</strong><span>${r.reason || '-'}</span>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;">
                    <button data-action="reject" style="background:#fff0f0;color:#9b1c1c;border:1px solid #f3b2b2;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Reject</button>
                    <button data-action="approve" style="background:#1f7a34;color:#fff;border:none;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Approve</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('[data-action="approve"]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('[data-id]');
                const id = card?.getAttribute('data-id');
                if (!id) return;
                try {
                    await window.KGL.API.post(`/users/password-change-requests/${id}/approve`, {});
                    window.KGL.Alerts.showSuccess('Request approved');
                    await load();
                    await window.KGL.Notifications?.refreshUnreadCount?.();
                } catch (error) {
                    window.KGL.Alerts.showError(error.message || 'Failed to approve request');
                }
            });
        });

        list.querySelectorAll('[data-action="reject"]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('[data-id]');
                const id = card?.getAttribute('data-id');
                if (!id) return;
                const reason = window.prompt('Reason for rejection (optional):', 'Rejected by director') || 'Rejected by director';
                try {
                    await window.KGL.API.post(`/users/password-change-requests/${id}/reject`, { reason });
                    window.KGL.Alerts.showSuccess('Request rejected');
                    await load();
                    await window.KGL.Notifications?.refreshUnreadCount?.();
                } catch (error) {
                    window.KGL.Alerts.showError(error.message || 'Failed to reject request');
                }
            });
        });
    };

    const load = async () => {
        const res = await window.KGL.API.get('/users/password-change-requests', { status: 'pending' });
        const rows = payload(res)?.items || [];
        render(rows);
    };

    const open = async () => {
        ensureModal();
        modal.style.display = 'block';
        modal.querySelector('#kgl-req-close').onclick = () => { modal.style.display = 'none'; };
        modal.querySelector('#kgl-req-refresh').onclick = () => load().catch((e) => window.KGL.Alerts.showError(e.message || 'Failed to refresh'));
        await load();
    };

    window.KGL.DirectorApprovals = { open, load };
})();

