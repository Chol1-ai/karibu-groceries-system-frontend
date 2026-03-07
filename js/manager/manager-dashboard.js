/* ===== MANAGER DASHBOARD MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    /* ===== MODULE HELPERS ===== */
    const payload = (response) => response?.data?.data || response?.data || null;
    const escapeHtml = (value) =>
        String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    const dateFormatter = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const formatAbsoluteDate = (daysOffset = 0) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + Number(daysOffset || 0));
        return dateFormatter.format(date);
    };
    /* ===== LOCAL STATE ===== */
    let settingsModal = null;
    let profileModal = null;
    /* ===== BRANCH CONTEXT ===== */
    const getActiveBranch = () => {
        const selected = document.getElementById('branchSelector')?.value;
        if (selected) return selected;
        const user = window.KGL.API.config.getCurrentUser();
        return user?.branch?._id || user?.branch || '';
    };

    /* ===== ACCESS CONTROL ===== */
    const ensureAccess = async () => {
        const role = localStorage.getItem('kgl_user_role') || window.KGL.API.config.getCurrentUser()?.role;
        if (!role) {
            window.location.href = 'login.html';
            return false;
        }
        if (!['manager', 'admin'].includes(role)) {
            window.KGL.Alerts.showError('You are not allowed to open manager dashboard');
            setTimeout(() => (window.location.href = 'login.html'), 600);
            return false;
        }
        return true;
    };

    /* ===== DASHBOARD DATA LOADING ===== */
    const updateCards = async () => {
        const branch = getActiveBranch();

        const [stockRes, salesRes, dueRes, lowRes, procurementRes, creditRes] = await Promise.all([
            window.KGL.API.get('/inventory/stats', { branch }),
            window.KGL.API.get('/sales/today', { branch }),
            window.KGL.API.get('/credit-sales/due', { branch }),
            window.KGL.API.get('/inventory/low-stock', { branch }),
            window.KGL.API.get('/procurements', { branch, limit: 5 }),
            window.KGL.API.get('/credit-sales', { branch, limit: 5 })
        ]);

        const stock = payload(stockRes) || {};
        const todaySales = payload(salesRes) || [];
        const due = payload(dueRes) || [];
        const lowStock = payload(lowRes) || [];
        const procurements = payload(procurementRes)?.items || [];
        const credits = (payload(creditRes)?.items || [])
            .filter((row) => Math.max(Number(row.amountDue || 0) - Number(row.amountPaid || 0), 0) > 0);

        const totalSalesKg = todaySales.reduce((s, row) => s + Number(row.quantityKg || 0), 0);
        const totalSalesValue = todaySales.reduce((s, row) => s + Number(row.totalAmount || 0), 0);
        const totalDue = due.reduce((s, row) => s + Math.max(Number(row.amountDue || 0) - Number(row.amountPaid || 0), 0), 0);

        document.getElementById('totalStock').textContent = window.KGL.Formatting.formatWeight(stock.totalStock || 0);
        document.getElementById('todaySales').textContent = window.KGL.Formatting.formatWeight(totalSalesKg);
        document.getElementById('todaySalesValue').textContent = window.KGL.Formatting.formatCurrency(totalSalesValue);
        document.getElementById('creditDue').textContent = window.KGL.Formatting.formatCurrency(totalDue);
        document.getElementById('overdueCount').textContent = `${due.filter((i) => new Date(i.dueDate) < new Date()).length} overdue`;
        document.getElementById('lowStockCount').textContent = `${lowStock.length} items`;

        const tbody = document.querySelector('#recentProcurementsTable tbody');
        if (tbody) {
            tbody.innerHTML = procurements.map((row) => `
                <tr>
                  <td>${escapeHtml(row.produce?.name || '-')}</td>
                  <td>${window.KGL.Formatting.formatWeight(row.quantityKg || 0)}</td>
                  <td>${window.KGL.Formatting.formatCurrency(row.totalCost || 0)}</td>
                  <td>${window.KGL.Formatting.formatDate(row.procurementDate)}</td>
                  <td>
                    <button class="inline-action-btn danger" data-action="delete-procurement" data-id="${escapeHtml(row._id || '')}" type="button">
                      Delete
                    </button>
                  </td>
                </tr>
            `).join('') || '<tr><td colspan="5">No procurements</td></tr>';
        }

        const creditsList = document.getElementById('pendingCreditsList');
        if (creditsList) {
            creditsList.innerHTML = credits.map((row) => {
                const outstanding = Math.max(Number(row.amountDue || 0) - Number(row.amountPaid || 0), 0);
                return `
                    <div class="credit-item">
                      <div class="credit-item-main">
                        <div class="credit-info">
                          <span class="credit-name">${escapeHtml(row.buyerName || 'Buyer')}</span>
                          <span class="credit-detail">Due: ${window.KGL.Formatting.formatDate(row.dueDate)}</span>
                        </div>
                        <span class="credit-amount">${window.KGL.Formatting.formatCurrency(outstanding)}</span>
                      </div>
                      <button class="inline-action-btn" data-action="clear-credit" data-id="${escapeHtml(row._id || '')}" type="button">
                        Clear
                      </button>
                    </div>
                `;
            }).join('') || '<div class="credit-item">No pending credits</div>';
        }
    };

    const hydrateStaticDemoDates = () => {
        document.querySelectorAll('.js-relative-date').forEach((node) => {
            const offset = Number(node.getAttribute('data-days-offset') || 0);
            node.textContent = formatAbsoluteDate(offset);
        });

        document.querySelectorAll('.js-due-date').forEach((node) => {
            const offset = Number(node.getAttribute('data-days-offset') || 0);
            node.textContent = `Due: ${formatAbsoluteDate(offset)}`;
        });
    };

    /* ===== SETTINGS MODAL ===== */
    const ensureSettingsModal = () => {
        if (settingsModal) return settingsModal;
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(7,13,27,.55);display:none;align-items:center;justify-content:center;z-index:26000;padding:16px;';
        modal.innerHTML = `
            <div style="width:min(310px,84vw);background:#f8fbff;border:1px solid #d4deea;border-radius:12px;box-shadow:0 14px 28px rgba(2,10,25,.22);overflow:hidden;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 12px;background:#fff;border-bottom:1px solid #dde6f2;">
                    <h3 style="margin:0;font:700 17px Inter,system-ui;color:#102a4d;">Settings</h3>
                    <button id="kgl-settings-close" type="button" style="border:none;background:transparent;font-size:18px;color:#5d7593;cursor:pointer;">x</button>
                </div>
                <div style="padding:8px 10px;display:grid;gap:6px;font-family:Inter,system-ui;">
                    <label style="display:grid;gap:4px;background:#ffffff;border:1px solid #dbe5f1;border-radius:8px;padding:7px 8px;">
                        <span style="font-weight:700;color:#1d3553;font-size:13px;">API Port</span>
                        <input id="kgl-settings-api-port" type="text" placeholder="3000" style="height:30px;border:1px solid #cfdced;border-radius:7px;padding:0 8px;font-size:12px;">
                    </label>
                    <label style="display:grid;gap:4px;background:#ffffff;border:1px solid #dbe5f1;border-radius:8px;padding:7px 8px;">
                        <span style="font-weight:700;color:#1d3553;font-size:13px;">Default Branch</span>
                        <select id="kgl-settings-branch" style="height:30px;border:1px solid #cfdced;border-radius:7px;padding:0 8px;font-size:12px;">
                            <option value="">Auto (from login)</option>
                            <option value="maganjo">Maganjo</option>
                            <option value="matugga">Matugga</option>
                        </select>
                    </label>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;background:#fff;border-top:1px solid #dde6f2;">
                    <button id="kgl-settings-cancel" type="button" style="background:#fff;color:#1e3552;border:1px solid #c9d6e4;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Cancel</button>
                    <button id="kgl-settings-save" type="button" style="background:#1f7a34;color:#fff;border:none;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        settingsModal = modal;
        return modal;
    };

    const openSettings = () => {
        const modal = ensureSettingsModal();
        modal.style.display = 'flex';
        const apiPort = localStorage.getItem('kgl_api_port') || '3000';
        const savedBranch = localStorage.getItem('kgl_default_branch') || '';
        const branch = ['maganjo', 'matugga', ''].includes(savedBranch) ? savedBranch : '';
        if (savedBranch && !branch) localStorage.removeItem('kgl_default_branch');
        modal.querySelector('#kgl-settings-api-port').value = apiPort;
        modal.querySelector('#kgl-settings-branch').value = branch;

        const close = () => { modal.style.display = 'none'; };
        modal.querySelector('#kgl-settings-close').onclick = close;
        modal.querySelector('#kgl-settings-cancel').onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };
        modal.querySelector('#kgl-settings-save').onclick = () => {
            const nextPort = (modal.querySelector('#kgl-settings-api-port').value || '').trim();
            const nextBranch = modal.querySelector('#kgl-settings-branch').value || '';
            if (!/^\d{2,5}$/.test(nextPort)) {
                window.KGL.Alerts.showError('API Port must be numeric, e.g. 3000');
                return;
            }
            localStorage.setItem('kgl_api_port', nextPort);
            localStorage.setItem('kgl_default_branch', nextBranch);
            if (window.KGL.API?.config) window.KGL.API.config.BASE_URL = null;
            close();
            window.KGL.Alerts.showSuccess('Settings saved');
        };
    };

    /* ===== PROFILE MODAL ===== */
    const ensureProfileModal = () => {
        if (profileModal) return profileModal;
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:84px;right:24px;display:none;z-index:26010;';
        modal.innerHTML = `
            <div style="width:min(360px,86vw);max-height:68vh;overflow:auto;background:#f8fbff;border:1px solid #d4deea;border-radius:12px;box-shadow:0 14px 28px rgba(2,10,25,.22);">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 12px;background:#fff;border-bottom:1px solid #dde6f2;">
                    <h3 style="margin:0;font:700 17px Inter,system-ui;color:#102a4d;">Profile Settings</h3>
                    <button id="kgl-profile-close" type="button" style="border:none;background:transparent;font-size:18px;color:#5d7593;cursor:pointer;">x</button>
                </div>
                <div style="padding:10px 12px;display:grid;gap:10px;font-family:Inter,system-ui;">
                    <div style="display:flex;gap:10px;align-items:center;">
                        <div style="width:48px;height:48px;border-radius:10px;overflow:hidden;border:1px solid #d7e2ef;background:#eef4fb;">
                            <img id="kgl-profile-preview" src="assets/images/My_pic.png" alt="Profile" style="width:100%;height:100%;object-fit:cover;">
                        </div>
                        <div style="display:grid;gap:4px;flex:1;">
                            <label style="font-weight:700;color:#1d3553;font-size:13px;">Profile Image</label>
                        </div>
                    </div>
                    <div style="display:grid;gap:6px;">
                        <label style="font-weight:700;color:#1d3553;font-size:13px;">Full Name</label>
                        <input id="kgl-profile-name" type="text" placeholder="Your name" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </div>
                    <div style="border-top:1px solid #dde6f2;padding-top:8px;display:grid;gap:8px;">
                        <h4 style="margin:0;font-size:13px;color:#102a4d;">Password Change Request (Director Approval)</h4>
                        <div style="display:grid;gap:6px;">
                            <label style="font-weight:700;color:#1d3553;font-size:13px;">Requested New Password</label>
                            <input id="kgl-profile-requested-password" type="password" minlength="6" placeholder="At least 6 characters" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                        </div>
                        <div style="display:grid;gap:6px;">
                            <label style="font-weight:700;color:#1d3553;font-size:13px;">Reason</label>
                            <textarea id="kgl-profile-request-reason" rows="2" placeholder="Why you want to change password..." style="border:1px solid #cfdced;border-radius:8px;padding:7px 9px;font-size:12px;resize:vertical;"></textarea>
                        </div>
                        <div>
                            <button id="kgl-profile-request-btn" type="button" style="background:#1f7a34;color:#fff;border:none;border-radius:8px;padding:7px 9px;font-weight:700;font-size:12px;cursor:pointer;">Send Request</button>
                        </div>
                    </div>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;background:#fff;border-top:1px solid #dde6f2;">
                    <button id="kgl-profile-cancel" type="button" style="background:#fff;color:#1e3552;border:1px solid #c9d6e4;border-radius:8px;padding:7px 9px;font-weight:700;font-size:12px;cursor:pointer;">Cancel</button>
                    <button id="kgl-profile-save" type="button" style="background:#1f7a34;color:#fff;border:none;border-radius:8px;padding:7px 9px;font-weight:700;font-size:12px;cursor:pointer;">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        profileModal = modal;
        return modal;
    };

    const openProfileSettings = () => {
        const modal = ensureProfileModal();
        modal.style.display = 'flex';
        const user = window.KGL.API.config.getCurrentUser() || {};
        const profileImg = document.getElementById('managerProfileImage');
        const imagePath = profileImg?.getAttribute('src') || 'assets/images/My_pic.png';

        modal.querySelector('#kgl-profile-name').value = user.name || '';
        modal.querySelector('#kgl-profile-preview').src = imagePath;
        modal.querySelector('#kgl-profile-requested-password').value = '';
        modal.querySelector('#kgl-profile-request-reason').value = '';

        const close = () => { modal.style.display = 'none'; };
        modal.querySelector('#kgl-profile-close').onclick = close;
        modal.querySelector('#kgl-profile-cancel').onclick = close;
        modal.onclick = () => {};

        modal.querySelector('#kgl-profile-save').onclick = async () => {
            try {
                const name = (modal.querySelector('#kgl-profile-name').value || '').trim();
                if (!name) return window.KGL.Alerts.showError('Name is required');
                if (!user?._id) return window.KGL.Alerts.showError('User session missing. Please login again.');

                await window.KGL.API.put(`/users/${user._id}`, { name });
                document.getElementById('managerName').textContent = name;

                const authRaw = localStorage.getItem('kgl_auth') || sessionStorage.getItem('kgl_auth');
                if (authRaw) {
                    const parsed = JSON.parse(authRaw);
                    parsed.user = { ...(parsed.user || {}), name };
                    localStorage.setItem('kgl_auth', JSON.stringify(parsed));
                    sessionStorage.setItem('kgl_auth', JSON.stringify(parsed));
                }

                window.KGL.Alerts.showSuccess('Profile updated');
            } catch (error) {
                window.KGL.Alerts.showError(error.message || 'Failed to update profile');
            }
        };

        modal.querySelector('#kgl-profile-request-btn').onclick = async () => {
            try {
                const requestedPassword = (modal.querySelector('#kgl-profile-requested-password').value || '').trim();
                const reason = (modal.querySelector('#kgl-profile-request-reason').value || '').trim();
                if (requestedPassword.length < 6) return window.KGL.Alerts.showError('Requested password must be at least 6 characters');
                try {
                    await window.KGL.API.post('/users/password-change-request', { requestedPassword, reason });
                } catch (endpointError) {
                    const msg = String(endpointError?.message || '');
                    if (msg.includes('Cannot find /api/v1/users/password-change-request')) {
                        throw new Error('Backend route missing. Restart backend on port 3000, then try again.');
                    }
                    throw endpointError;
                }
                modal.querySelector('#kgl-profile-requested-password').value = '';
                modal.querySelector('#kgl-profile-request-reason').value = '';
                window.KGL.Alerts.showSuccess('Password request sent to director for approval');
            } catch (error) {
                window.KGL.Alerts.showError(error.message || 'Failed to send password request');
            }
        };
    };

    const bindRecentActionHandlers = () => {
        const procurementsTable = document.getElementById('recentProcurementsTable');
        if (procurementsTable) {
            procurementsTable.addEventListener('click', async (event) => {
                const button = event.target.closest('button[data-action="delete-procurement"]');
                if (!button) return;

                const procurementId = button.getAttribute('data-id');
                if (!procurementId) return;

                const confirmed = window.confirm('Delete this procurement record?');
                if (!confirmed) return;

                try {
                    button.disabled = true;
                    await window.KGL.API.delete(`/procurements/${procurementId}`);
                    window.KGL.Alerts.showSuccess('Procurement deleted');
                    await updateCards();
                } catch (error) {
                    window.KGL.Alerts.showError(error.message || 'Failed to delete procurement');
                } finally {
                    button.disabled = false;
                }
            });
        }

        const creditsList = document.getElementById('pendingCreditsList');
        if (creditsList) {
            creditsList.addEventListener('click', async (event) => {
                const button = event.target.closest('button[data-action="clear-credit"]');
                if (!button) return;

                const creditId = button.getAttribute('data-id');
                if (!creditId) return;

                const confirmed = window.confirm('Clear this pending credit?');
                if (!confirmed) return;

                try {
                    button.disabled = true;
                    await window.KGL.API.post(`/credit-sales/${creditId}/clear`, {});
                    window.KGL.Alerts.showSuccess('Pending credit cleared');
                    await updateCards();
                } catch (error) {
                    window.KGL.Alerts.showError(error.message || 'Failed to clear credit');
                } finally {
                    button.disabled = false;
                }
            });
        }
    };

    /* ===== UI EVENT BINDINGS ===== */
    const bindActions = () => {
        const bindCard = (id, action) => {
            const node = document.getElementById(id);
            if (!node || typeof action !== 'function') return;
            node.style.cursor = 'pointer';
            node.addEventListener('click', action);
            node.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    action();
                }
            });
        };

        bindCard('cardTotalStock', () => window.KGL.Inventory?.showInventory());
        bindCard('cardTodaySales', () => window.KGL.SalesView?.recordSale?.() || window.KGL.SalesView?.showReport());
        bindCard('cardCreditDue', () => window.KGL.CreditView?.showOverview());
        bindCard('cardLowStock', () => window.KGL.Inventory?.showInventory());

        document.getElementById('newProcurementBtn')?.addEventListener('click', () => window.KGL.Procurement?.showNewProcurementForm());
        document.getElementById('recordSaleBtn')?.addEventListener('click', () => window.KGL.SalesView?.recordSale?.());
        document.getElementById('salesReportBtn')?.addEventListener('click', () => window.KGL.SalesView?.showReport());
        document.getElementById('creditOverviewBtn')?.addEventListener('click', () => window.KGL.CreditView?.showOverview());
        document.getElementById('manageStockBtn')?.addEventListener('click', () => window.KGL.Inventory?.manageStock?.());
        document.getElementById('settingsBtn')?.addEventListener('click', openProfileSettings);
        document.getElementById('headerProfileBtn')?.addEventListener('click', openProfileSettings);
        document.getElementById('headerNotifications')?.addEventListener('click', () => window.KGL.Notifications?.openPanel());
        document.getElementById('headerNotifications')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.KGL.Notifications?.openPanel();
            }
        });
        document.getElementById('viewAllProcurements')?.addEventListener('click', (e) => { e.preventDefault(); window.KGL.Procurement?.showAllProcurements(); });
        document.getElementById('viewAllCredits')?.addEventListener('click', (e) => { e.preventDefault(); window.KGL.CreditView?.showAllCredits(); });

        document.addEventListener('navigation:changed', (e) => {
            const page = e.detail?.page;
            if (page === 'procurement') window.KGL.Procurement?.showAllProcurements();
            if (page === 'inventory') window.KGL.Inventory?.manageStock?.();
            if (page === 'sales-view') window.KGL.SalesView?.showReport();
            if (page === 'credit-view') window.KGL.CreditView?.showOverview();
            if (page === 'notifications') window.KGL.Notifications?.openPanel();
            if (page === 'profile') openProfileSettings();
            if (page === 'dashboard') updateCards();
        });

        bindRecentActionHandlers();
    };

    /* ===== MODULE INIT ===== */
    const init = async () => {
        const ok = await ensureAccess();
        if (!ok) return;
        const user = window.KGL.API.config.getCurrentUser();
        if (user?.name) document.getElementById('managerName').textContent = user.name;
        const imagePath = localStorage.getItem('kgl_profile_image') || user?.profileImage || 'assets/images/My_pic.png';
        const profileImg = document.getElementById('managerProfileImage');
        if (profileImg) profileImg.src = imagePath;
        document.getElementById('currentDate').textContent = window.KGL.Formatting.formatCurrentDate();
        hydrateStaticDemoDates();
        bindActions();
        await window.KGL.Notifications?.refreshUnreadCount?.();
        await updateCards();
    };

    document.addEventListener('DOMContentLoaded', init);
    window.KGL.ManagerDashboard = { init, refreshData: updateCards };
})();

