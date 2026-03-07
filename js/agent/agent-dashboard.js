/* ===== AGENT DASHBOARD MODULE ===== */
window.KGL = window.KGL || {};

(function () {
    /* ===== MODULE HELPERS ===== */
    const payload = (response) => response?.data?.data || response?.data || null;
    const escapeHtml = (value) =>
        String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    /* ===== LOCAL STATE ===== */
    const branchState = {
        id: '',
        name: '',
    };

    /* ===== BRANCH STATE STORAGE ===== */
    const setActiveBranch = (id, name = '') => {
        branchState.id = id || '';
        branchState.name = name || '';
        if (branchState.id) {
            sessionStorage.setItem('kgl_active_branch_id', branchState.id);
            localStorage.setItem('kgl_active_branch_id', branchState.id);
        }
        if (branchState.name) {
            sessionStorage.setItem('kgl_active_branch_name', branchState.name);
            localStorage.setItem('kgl_active_branch_name', branchState.name);
        }
    };

    const getStoredBranchId = () =>
        sessionStorage.getItem('kgl_active_branch_id') ||
        localStorage.getItem('kgl_active_branch_id') ||
        '';
    const getStoredBranchName = () =>
        sessionStorage.getItem('kgl_active_branch_name') ||
        localStorage.getItem('kgl_active_branch_name') ||
        '';
    const getSelectedBranchId = () => document.getElementById('agentBranchSelect')?.value || '';

    /* ===== BRANCH RESOLUTION ===== */
    const resolveBranchMeta = async () => {
        const user = window.KGL.API.config.getCurrentUser() || {};
        const directId =
            user?.branch?._id ||
            user?.branchId ||
            (typeof user?.branch === 'string' ? user.branch : '');
        const directName = user?.branch?.name || '';
        const selectedId = getSelectedBranchId();
        const savedId = getStoredBranchId();
        const savedName = getStoredBranchName();
        const branchNameText = (
            document.getElementById('agentBranchSelect')?.selectedOptions?.[0]?.textContent || ''
        )
            .replace(/\s+Branch$/i, '')
            .trim();
        const candidates = [
            selectedId,
            savedId,
            savedName,
            directId,
            directName,
            branchNameText,
        ].filter(Boolean);
        const candidate = candidates[0] || '';
        if (!candidate) return '';
        try {
            const res = await window.KGL.API.get('/branches', { limit: 20 });
            const rows = payload(res)?.items || [];
            for (const item of candidates) {
                const key = String(item)
                    .toLowerCase()
                    .replace(/\s+branch$/, '');
                const found = rows.find(
                    (b) =>
                        String(b._id || '').toLowerCase() === key ||
                        String(b.code || '')
                            .toLowerCase()
                            .replace(/\s+branch$/, '') === key ||
                        String(b.name || '')
                            .toLowerCase()
                            .replace(/\s+branch$/, '') === key
                );
                if (found?._id) return { id: found._id, name: found.name || '' };
            }
            return { id: candidate, name: directName || savedName || branchNameText || '' };
        } catch {
            return { id: candidate, name: directName || savedName || branchNameText || '' };
        }
    };

    const hydrateBranchSelector = async () => {
        const select = document.getElementById('agentBranchSelect');
        if (!select) return;
        try {
            const res = await window.KGL.API.get('/branches', { limit: 50 });
            const rows = payload(res)?.items || [];
            const user = window.KGL.API.config.getCurrentUser() || {};
            const userBranchId =
                user?.branch?._id ||
                user?.branchId ||
                (typeof user?.branch === 'string' ? user.branch : '');
            const selected = getSelectedBranchId() || getStoredBranchId() || userBranchId || '';
            select.innerHTML = rows
                .map((b) => `<option value="${b._id}">${b.name} Branch</option>`)
                .join('');
            if (selected) {
                const exists = rows.some((b) => b._id === selected);
                if (exists) select.value = selected;
            }
            if (!select.value && rows[0]?._id) select.value = rows[0]._id;
            const current = rows.find((b) => b._id === select.value);
            if (current?._id) setActiveBranch(current._id, current.name || '');
        } catch {
            // selector remains unchanged if branch API fails
        }
    };

    const ensureAccess = () => {
        const role =
            localStorage.getItem('kgl_user_role') || window.KGL.API.config.getCurrentUser()?.role;
        if (!['agent', 'manager', 'admin'].includes(role)) {
            window.KGL.Alerts.showError('You are not allowed to open agent dashboard');
            setTimeout(() => (window.location.href = 'login.html'), 500);
            return false;
        }
        return true;
    };

    /* ===== DASHBOARD DATA LOADING ===== */
    const refreshData = async () => {
        const user = window.KGL.API.config.getCurrentUser();
        const branchMeta = await resolveBranchMeta();
        const branch = branchMeta?.id || '';
        setActiveBranch(branch, branchMeta?.name || '');
        const agent = user?._id;

        const [salesRes, creditRes, stockRes] = await Promise.all([
            window.KGL.API.get('/sales', { agent, limit: 80 }),
            window.KGL.API.get('/credit-sales', { agent, branch, limit: 80 }),
            window.KGL.API.get('/inventory/available', { branch }),
        ]);

        const salesRows = payload(salesRes)?.items || [];
        const creditRows = payload(creditRes)?.items || [];
        const stockRows = payload(stockRes) || [];

        const now = new Date();
        const todayRows = salesRows.filter(
            (s) => new Date(s.saleDate).toDateString() === now.toDateString()
        );
        const todayAmount = todayRows.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
        const target = 2000000;

        document.getElementById('todaySales').textContent =
            window.KGL.Formatting.formatCurrency(todayAmount);
        document.getElementById('dailyTarget').textContent =
            window.KGL.Formatting.formatCurrency(target);
        document.getElementById('currentDate').textContent =
            window.KGL.Formatting.formatCurrentDate();
        if (document.getElementById('agentName')) {
            const displayName = user?.name === 'Sales Agent' ? 'John' : (user?.name || 'John');
            document.getElementById('agentName').textContent = displayName;
        }
        const branchSelect = document.getElementById('agentBranchSelect');
        if (branchSelect) {
            if (branch) branchSelect.value = branch;
            const finalBranchName =
                branchMeta?.name || user?.branch?.name || getStoredBranchName() || '';
            if (finalBranchName && branchSelect.selectedIndex < 0) {
                branchSelect.innerHTML = `<option value="${branch || ''}">${finalBranchName} Branch</option>`;
                if (branch) branchSelect.value = branch;
            }
        }

        const map = (code) => stockRows.find((r) => r.produce?.code === code) || null;
        const beans = map('beans');
        const maize = map('maize');
        const cowpeas = map('cowpeas');
        const groundnuts = map('groundnuts');

        if (document.getElementById('beansStock'))
            document.getElementById('beansStock').textContent = window.KGL.Formatting.formatWeight(
                beans?.availableStock || 0
            );
        if (document.getElementById('maizeStock'))
            document.getElementById('maizeStock').textContent = window.KGL.Formatting.formatWeight(
                maize?.availableStock || 0
            );
        if (document.getElementById('cowpeasStock'))
            document.getElementById('cowpeasStock').textContent =
                window.KGL.Formatting.formatWeight(cowpeas?.availableStock || 0);
        if (document.getElementById('gnutsStock'))
            document.getElementById('gnutsStock').textContent = window.KGL.Formatting.formatWeight(
                groundnuts?.availableStock || 0
            );
        if (document.getElementById('beansPrice'))
            document.getElementById('beansPrice').textContent =
                `${window.KGL.Formatting.formatCurrency(beans?.produce?.defaultSellingPrice || 0)}/kg`;
        if (document.getElementById('maizePrice'))
            document.getElementById('maizePrice').textContent =
                `${window.KGL.Formatting.formatCurrency(maize?.produce?.defaultSellingPrice || 0)}/kg`;
        if (document.getElementById('cowpeasPrice'))
            document.getElementById('cowpeasPrice').textContent =
                `${window.KGL.Formatting.formatCurrency(cowpeas?.produce?.defaultSellingPrice || 0)}/kg`;
        if (document.getElementById('gnutsPrice'))
            document.getElementById('gnutsPrice').textContent =
                `${window.KGL.Formatting.formatCurrency(groundnuts?.produce?.defaultSellingPrice || 0)}/kg`;

        const recent = [
            ...salesRows.map((sale) => ({
                kind: 'cash',
                id: sale._id,
                status: sale.status,
                produceName: sale.produce?.name || '-',
                quantityKg: sale.quantityKg || 0,
                buyerName: sale.buyerName || '-',
                amount: sale.totalAmount || 0,
                when: sale.saleDate
            })),
            ...creditRows.map((credit) => {
                const outstanding = Math.max(
                    Number(credit.amountDue || 0) - Number(credit.amountPaid || 0),
                    0
                );
                return {
                    kind: 'credit',
                    id: credit._id,
                    status: credit.status,
                    produceName: credit.produce?.name || '-',
                    quantityKg: credit.quantityKg || 0,
                    buyerName: credit.buyerName || '-',
                    amount: outstanding || Number(credit.amountDue || 0),
                    when: credit.dispatchDate || credit.dueDate
                };
            })
        ]
            .sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0))
            .slice(0, 4);
        const list = document.getElementById('recentSalesList');
        if (list) {
            list.innerHTML =
                recent
                    .map((row) => {
                        const isCash = row.kind === 'cash';
                        const isCleared = row.status === 'cleared';
                        const action = isCleared ? 'restore-sale' : 'clear-sale';
                        const label = isCleared ? 'Restore' : 'Clear';
                        const btnClass = isCleared
                            ? 'sale-clear-btn sale-restore-btn'
                            : 'sale-clear-btn';
                        const saleActionButton = isCash
                            ? `<button class="${btnClass}" type="button" data-action="${action}" data-id="${escapeHtml(row.id || '')}">
                            ${label}
                        </button>`
                            : '';
                        return `
                <div class="sale-item ${isCash && isCleared ? 'sale-item-cleared' : ''}">
                    <div class="sale-info">
                        <span class="sale-produce">${escapeHtml(row.produceName)} (${window.KGL.Formatting.formatWeight(row.quantityKg || 0)})${isCash ? '' : ' [Credit]'}</span>
                        <span class="sale-buyer">Buyer: ${escapeHtml(row.buyerName || '-')}</span>
                    </div>
                    <div class="sale-details">
                        <span class="sale-amount">${window.KGL.Formatting.formatCurrency(row.amount || 0)}</span>
                        <span class="sale-time">${window.KGL.Formatting.formatDateTime(row.when)}</span>
                        ${saleActionButton}
                    </div>
                </div>
            `;
                    })
                    .join('') || '<div class="sale-item">No recent sales</div>';
        }
    };

    const getProfileBranchLabel = async () => {
        const user = window.KGL.API.config.getCurrentUser() || {};
        if (user?.branch?.name) return user.branch.name;

        const selectedLabel = (
            document.getElementById('agentBranchSelect')?.selectedOptions?.[0]?.textContent || ''
        )
            .replace(/\s+Branch$/i, '')
            .trim();
        if (selectedLabel) return selectedLabel;

        const storedName = getStoredBranchName();
        if (storedName) return storedName;

        const rawBranch =
            user?.branch?._id ||
            user?.branchId ||
            (typeof user?.branch === 'string' ? user.branch : '') ||
            getStoredBranchId();
        if (!rawBranch) return 'N/A';

        try {
            const res = await window.KGL.API.get('/branches', { limit: 50 });
            const rows = payload(res)?.items || [];
            const key = String(rawBranch).toLowerCase().replace(/\s+branch$/, '');
            const found = rows.find(
                (b) =>
                    String(b._id || '').toLowerCase() === key ||
                    String(b.code || '')
                        .toLowerCase()
                        .replace(/\s+branch$/, '') === key ||
                    String(b.name || '')
                        .toLowerCase()
                        .replace(/\s+branch$/, '') === key
            );
            return found?.name || String(rawBranch);
        } catch {
            return String(rawBranch);
        }
    };

    /* ===== UI EVENT BINDINGS ===== */
    const bindActions = () => {
        document.querySelectorAll('.nav-parent').forEach((btn) => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const menu = targetId ? document.getElementById(targetId) : null;
                if (!menu) return;
                const willOpen = !menu.classList.contains('open');
                menu.classList.toggle('open', willOpen);
                btn.setAttribute('aria-expanded', String(willOpen));
            });
        });

        document
            .getElementById('newCashSaleBtn')
            ?.addEventListener('click', () => window.KGL.Sales?.showNewSaleForm('cash'));
        document
            .getElementById('newCreditSaleBtn')
            ?.addEventListener('click', () => window.KGL.CreditSales?.showNewCreditSaleForm());
        document
            .getElementById('checkStockBtn')
            ?.addEventListener('click', () => window.KGL.StockCheck?.showStockCheck());
        document
            .getElementById('viewPerformanceBtn')
            ?.addEventListener('click', () => window.KGL.StockCheck?.showPerformance());
        document.getElementById('viewAllSales')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.KGL.Sales?.showSalesHistory();
        });
        document.getElementById('headerProfileBtn')?.addEventListener('click', () => {
            document.dispatchEvent(
                new CustomEvent('navigation:changed', { detail: { page: 'profile' } })
            );
        });
        document
            .getElementById('headerNotifications')
            ?.addEventListener('click', () => window.KGL.Notifications?.openPanel());
        document.getElementById('headerNotifications')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.KGL.Notifications?.openPanel();
            }
        });
        document.getElementById('agentBranchSelect')?.addEventListener('change', async (e) => {
            const id = e.target.value || '';
            const name =
                e.target.selectedOptions?.[0]?.textContent?.replace(/\s+Branch$/i, '') || '';
            if (!id) return;
            setActiveBranch(id, name);
            await refreshData();
            await window.KGL.Notifications?.refreshUnreadCount?.();
        });
        document.querySelectorAll('.stock-card').forEach((card) => {
            card.addEventListener('click', () => {
                const product = card.dataset.product || '';
                if (!product) return;
                window.KGL.Sales?.showNewSaleForm('cash', product);
            });
        });
        document.getElementById('recentSalesList')?.addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-action="clear-sale"], button[data-action="restore-sale"]');
            if (!button) return;

            const saleId = button.getAttribute('data-id');
            if (!saleId) return;
            const isRestore = button.getAttribute('data-action') === 'restore-sale';

            const confirmed = window.confirm(
                isRestore
                    ? 'Restore this cleared sale back to active recent sales?'
                    : 'Clear this recent sale from the dashboard list?'
            );
            if (!confirmed) return;

            try {
                button.disabled = true;
                const endpoint = isRestore ? `/sales/${saleId}/restore` : `/sales/${saleId}/clear`;
                await window.KGL.API.post(endpoint, {});
                window.KGL.Alerts.showSuccess(isRestore ? 'Sale restored' : 'Sale cleared');
                await refreshData();
            } catch (error) {
                window.KGL.Alerts.showError(error.message || `Failed to ${isRestore ? 'restore' : 'clear'} sale`);
            } finally {
                button.disabled = false;
            }
        });

        document.addEventListener('navigation:changed', (e) => {
            const page = e.detail?.page;
            if (page === 'new-sale') window.KGL.Sales?.showNewSaleForm('cash');
            if (page === 'credit-sale') window.KGL.CreditSales?.showNewCreditSaleForm();
            if (page === 'sales-history') window.KGL.Sales?.showSalesHistory();
            if (page === 'check-stock') window.KGL.StockCheck?.showStockCheck();
            if (page === 'prices') window.KGL.StockCheck?.showStockCheck();
            if (page === 'profile') {
                (async () => {
                    const user = window.KGL.API.config.getCurrentUser() || {};
                    const branch = await getProfileBranchLabel();
                    const displayName =
                        user?.name === 'Sales Agent' ? 'John' : (user?.name || 'John');
                    window.KGL.Alerts.showAlert({
                        title: 'Profile',
                        message: `Name: ${displayName}\nRole: ${user.role || '-'}\nBranch: ${branch}`,
                    });
                })();
            }
            if (page === 'dashboard') refreshData();
        });
    };

    /* ===== MODULE INIT ===== */
    const init = async () => {
        if (!ensureAccess()) return;
        const user = window.KGL.API.config.getCurrentUser();
        const profileImg = document.getElementById('agentProfileImage');
        if (profileImg) profileImg.src = user?.profileImage || 'assets/images/My_pic.png';
        bindActions();
        await hydrateBranchSelector();
        await window.KGL.Notifications?.refreshUnreadCount?.();
        await refreshData();
    };

    document.addEventListener('DOMContentLoaded', init);
    window.KGL.AgentDashboard = { init, refreshData };
})();
