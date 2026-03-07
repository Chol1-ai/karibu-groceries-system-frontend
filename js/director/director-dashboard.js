/* ===== DIRECTOR DASHBOARD MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    /* ===== MODULE HELPERS ===== */
    const payload = (response) => response?.data?.data || response?.data || null;
    const state = {
        branchComparison: []
    };
    const displayName = (user) => {
        const role = String(user?.role || '').toLowerCase();
        const name = String(user?.name || '').trim();
        if (role === 'director' && (!name || name.toLowerCase() === 'executive director')) {
            return 'Mr. Orban';
        }
        return name || 'Director';
    };
    const roleLabel = (role) => {
        const key = String(role || '').toLowerCase();
        if (key === 'director') return 'Director';
        if (key === 'admin') return 'Administrator';
        if (key === 'manager') return 'Branch Manager';
        if (key === 'agent') return 'Sales Agent';
        return role || '-';
    };

    /* ===== ACCESS CONTROL ===== */
    const ensureAccess = async () => {
        let role = localStorage.getItem('kgl_user_role') || window.KGL.API.config.getCurrentUser()?.role;
        if (['director', 'admin', 'manager'].includes(role)) return true;

        if (window.KGL.API.config.isAuthenticated()) {
            try {
                const verifyRes = await window.KGL.API.get('/auth/verify');
                const verifiedUser = payload(verifyRes)?.user;
                if (verifiedUser?.role) {
                    const existingRaw = localStorage.getItem('kgl_auth') || sessionStorage.getItem('kgl_auth');
                    if (existingRaw) {
                        const existing = JSON.parse(existingRaw);
                        const updated = { ...existing, user: verifiedUser };
                        localStorage.setItem('kgl_auth', JSON.stringify(updated));
                        sessionStorage.setItem('kgl_auth', JSON.stringify(updated));
                    }
                    localStorage.setItem('kgl_user_role', verifiedUser.role);
                    role = verifiedUser.role;
                }
            } catch {
                // Let the guard below handle redirect.
            }
        }

        if (!['director', 'admin', 'manager'].includes(role)) {
            window.KGL.Alerts.showError('You are not allowed to open director dashboard');
            setTimeout(() => (window.location.href = 'login.html'), 900);
            return false;
        }
        return true;
    };

    /* ===== DASHBOARD DATA LOADING ===== */
    const refreshData = async () => {
        const [overviewRes, comparisonRes, trendRes] = await Promise.all([
            window.KGL.API.get('/analytics/overview'),
            window.KGL.API.get('/analytics/branches/comparison'),
            window.KGL.API.get('/analytics/charts/trend')
        ]);

        const overview = payload(overviewRes) || {};
        const branches = payload(comparisonRes) || [];
        const trend = payload(trendRes) || [];
        state.branchComparison = branches;

        const totalRevenue = Number(overview.totalRevenue || 0);
        const totalSalesVolume = Number(overview.totalSalesVolume || 0);
        const totalProcurements = Number(overview.totalProcurements || 0);
        const outstandingCredit = Number(overview.outstandingCredit || 0);

        document.getElementById('totalRevenue').textContent = window.KGL.Formatting.formatCurrency(totalRevenue);
        document.getElementById('totalVolume').textContent = window.KGL.Formatting.formatWeight(totalSalesVolume);
        document.getElementById('totalProcurements').textContent = window.KGL.Formatting.formatWeight(totalProcurements);
        document.getElementById('outstandingCredit').textContent = window.KGL.Formatting.formatCurrency(outstandingCredit);

        const [b1, b2] = branches;
        if (b1) {
            document.getElementById('maganjoSales').textContent = window.KGL.Formatting.formatCurrency(b1.revenue || 0);
            document.getElementById('maganjoSalesAmount').textContent = window.KGL.Formatting.formatCurrency(b1.revenue || 0);
            document.getElementById('maganjoVolume').textContent = window.KGL.Formatting.formatWeight(b1.volumeKg || 0);
            document.getElementById('maganjoProcurements').textContent = window.KGL.Formatting.formatWeight(b1.procurementsKg || 0);
            document.getElementById('maganjoCredit').textContent = window.KGL.Formatting.formatCurrency(b1.creditOutstanding || 0);
        }
        if (b2) {
            document.getElementById('matuggaSales').textContent = window.KGL.Formatting.formatCurrency(b2.revenue || 0);
            document.getElementById('matuggaSalesAmount').textContent = window.KGL.Formatting.formatCurrency(b2.revenue || 0);
            document.getElementById('matuggaVolume').textContent = window.KGL.Formatting.formatWeight(b2.volumeKg || 0);
            document.getElementById('matuggaProcurements').textContent = window.KGL.Formatting.formatWeight(b2.procurementsKg || 0);
            document.getElementById('matuggaCredit').textContent = window.KGL.Formatting.formatCurrency(b2.creditOutstanding || 0);
        }

        document.getElementById('totalSalesAmount').textContent = window.KGL.Formatting.formatCurrency(totalRevenue);
        document.getElementById('totalVolumeAmount').textContent = window.KGL.Formatting.formatWeight(totalSalesVolume);
        document.getElementById('totalProcurementsAmount').textContent = window.KGL.Formatting.formatWeight(totalProcurements);
        document.getElementById('totalCreditAmount').textContent = window.KGL.Formatting.formatCurrency(outstandingCredit);

        const max = Math.max(...trend.map((t) => Number(t.amount || 0)), 1);
        const chart = document.getElementById('branchSalesChart');
        if (chart) {
            const fills = chart.querySelectorAll('.bar-fill');
            if (fills[0] && b1) fills[0].style.width = `${Math.max(8, Math.round((Number(b1.revenue || 0) / Math.max(Number(b1.revenue || 1), Number(b2?.revenue || 1))) * 100))}%`;
            if (fills[1] && b2) fills[1].style.width = `${Math.max(8, Math.round((Number(b2.revenue || 0) / Math.max(Number(b1?.revenue || 1), Number(b2.revenue || 1))) * 100))}%`;
        }

        document.getElementById('revenueGrowth').textContent = `vs last period: ${(totalRevenue / 1000000).toFixed(1)}M`;
        document.getElementById('volumeGrowth').textContent = `vs last period: ${(totalSalesVolume / 1000).toFixed(1)}t`;
        document.getElementById('procurementGrowth').textContent = `vs last period: ${(totalProcurements / 1000).toFixed(1)}t`;
        document.getElementById('creditChange').textContent = `open credits: ${window.KGL.Formatting.formatCurrency(outstandingCredit)}`;
        await window.KGL.DirectorCharts?.loadCharts?.();
    };

    const getBranchLabel = (row, index) =>
        row?.branch?.name || row?.branchName || row?.name || `Branch ${index + 1}`;

    const renderContributionRows = (key, formatter) => {
        const rows = state.branchComparison || [];
        const total = rows.reduce((sum, row) => sum + Number(row?.[key] || 0), 0);
        if (!rows.length) return 'No branch contribution data available';
        return rows
            .map((row, index) => {
                const value = Number(row?.[key] || 0);
                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return `${getBranchLabel(row, index)}: ${formatter(value)} (${percent}%)`;
            })
            .join('\n');
    };

    const bindCardDetails = () => {
        const bind = (id, title, key, formatter) => {
            const card = document.getElementById(id);
            if (!card) return;
            const open = () => {
                const message = renderContributionRows(key, formatter);
                window.KGL.Alerts.showAlert({ title, message });
            };
            card.style.cursor = 'pointer';
            card.addEventListener('click', open);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open();
                }
            });
        };

        bind(
            'cardRevenue',
            'Revenue Contribution by Branch',
            'revenue',
            (value) => window.KGL.Formatting.formatCurrency(value)
        );
        bind(
            'cardSalesVolume',
            'Sales Volume Contribution by Branch',
            'volumeKg',
            (value) => window.KGL.Formatting.formatWeight(value)
        );
        bind(
            'cardProcurements',
            'Procurement Contribution by Branch',
            'procurementsKg',
            (value) => window.KGL.Formatting.formatWeight(value)
        );
        bind(
            'cardCredit',
            'Outstanding Credit by Branch',
            'creditOutstanding',
            (value) => window.KGL.Formatting.formatCurrency(value)
        );
    };

    /* ===== UI EVENT BINDINGS ===== */
    const bindActions = () => {
        document.getElementById('headerNotifications')?.addEventListener('click', () => window.KGL.Notifications?.openPanel());
        document.getElementById('headerNotifications')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.KGL.Notifications?.openPanel();
            }
        });

        document.getElementById('headerProfileBtn')?.addEventListener('click', () => {
            document.dispatchEvent(
                new CustomEvent('navigation:changed', {
                    detail: { page: 'profile' }
                })
            );
        });

        document.getElementById('exportBtn')?.addEventListener('click', async () => {
            try {
                await window.KGL.API.download('/analytics/reports/generate', 'kgl-report.pdf');
                window.KGL.Alerts.showSuccess('Report downloaded');
            } catch (error) {
                window.KGL.Alerts.showError(error.message || 'Failed to export');
            }
        });

        document.addEventListener('navigation:changed', (e) => {
            const page = e.detail?.page;
            if (page === 'dashboard' || page === 'overview') window.KGL.DirectorDashboard.refreshData();
            if (page === 'sales-summary') window.KGL.DirectorSummaries.showSalesSummary();
            if (page === 'procurement-summary') window.KGL.DirectorSummaries.showProcurementSummary();
            if (page === 'credit-summary') window.KGL.DirectorSummaries.showCreditSummary();
            if (page === 'reports') document.getElementById('exportBtn')?.click();
            if (page === 'maganjo-branch') window.KGL.DirectorAnalytics.showBranch('maganjo');
            if (page === 'matugga-branch') window.KGL.DirectorAnalytics.showBranch('matugga');
            if (page === 'password-requests') window.KGL.DirectorApprovals?.open();
            if (page === 'profile') {
                const user = window.KGL.API.config.getCurrentUser() || {};
                window.KGL.Alerts.showAlert({
                    title: 'Profile',
                    message: `Name: ${displayName(user)}\nRole: ${roleLabel(user.role)}`
                });
            }
        });
    };

    /* ===== MODULE INIT ===== */
    const init = async () => {
        if (!(await ensureAccess())) return;
        const user = window.KGL.API.config.getCurrentUser() || {};
        const nameEl = document.getElementById('directorName');
        const roleEl = document.getElementById('directorRole');
        const imgEl = document.getElementById('directorProfileImage');
        if (nameEl) nameEl.textContent = displayName(user);
        if (roleEl) roleEl.textContent = roleLabel(user.role);
        if (imgEl) imgEl.src = user.profileImage || 'assets/images/My_pic.png';
        bindActions();
        bindCardDetails();
        await window.KGL.Notifications?.refreshUnreadCount?.();
        await refreshData();
    };

    document.addEventListener('DOMContentLoaded', init);
    window.KGL.DirectorDashboard = { init, refreshData };
})();

