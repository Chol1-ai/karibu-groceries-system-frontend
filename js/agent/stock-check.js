/* ===== AGENT STOCK CHECK MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    /* ===== MODULE HELPERS ===== */
    const payload = (response) => response?.data?.data || response?.data || null;
    /* ===== BRANCH RESOLUTION ===== */
    const resolveBranchId = async () => {
        const cached = sessionStorage.getItem('kgl_active_branch_id') || localStorage.getItem('kgl_active_branch_id') || '';
        if (cached) return cached;
        const user = window.KGL.API.config.getCurrentUser() || {};
        const selected = document.getElementById('agentBranchSelect')?.value || '';
        const direct = user?.branch?._id || user?.branchId || (typeof user?.branch === 'string' ? user.branch : '');
        if (direct && String(direct).startsWith('b_')) return direct;
        const branchNameText = (document.getElementById('agentBranchSelect')?.selectedOptions?.[0]?.textContent || '').replace(/\s+Branch$/i, '').trim();
        const candidate = selected || direct || branchNameText;
        if (!candidate) return '';
        try {
            const res = await window.KGL.API.get('/branches', { limit: 20 });
            const rows = payload(res)?.items || [];
            const key = String(candidate).toLowerCase().replace(/\s+branch$/, '');
            const found = rows.find((b) =>
                String(b._id || '').toLowerCase() === key ||
                String(b.code || '').toLowerCase().replace(/\s+branch$/, '') === key ||
                String(b.name || '').toLowerCase().replace(/\s+branch$/, '') === key
            );
            const branch = found?._id || candidate;
            if (branch) {
                sessionStorage.setItem('kgl_active_branch_id', branch);
                localStorage.setItem('kgl_active_branch_id', branch);
            }
            return branch;
        } catch {
            return candidate;
        }
    };

    /* ===== STOCK VIEW ===== */
    const showStockCheck = async () => {
        try {
            const branch = await resolveBranchId();
            const res = await window.KGL.API.get('/inventory/available', { branch });
            const rows = payload(res) || [];
            const msg = rows.map((r) => `${r.produce?.name || '-'}: ${window.KGL.Formatting.formatWeight(r.availableStock || 0)} @ ${window.KGL.Formatting.formatCurrency(r.produce?.defaultSellingPrice || 0)}/kg`).join('\n') || 'No stock records';
            await window.KGL.Alerts.showAlert({ title: 'Stock Information', message: msg });
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to load stock information');
        }
    };

    /* ===== PERFORMANCE VIEW ===== */
    const showPerformance = async () => {
        try {
            const user = window.KGL.API.config.getCurrentUser();
            const res = await window.KGL.API.get('/sales', { agent: user?._id, limit: 500 });
            const rows = payload(res)?.items || [];
            const today = rows.filter((r) => new Date(r.saleDate).toDateString() === new Date().toDateString()).reduce((s, r) => s + Number(r.totalAmount || 0), 0);
            const total = rows.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
            await window.KGL.Alerts.showAlert({ title: 'My Performance', message: `Today's Sales: ${window.KGL.Formatting.formatCurrency(today)}\nTransactions: ${rows.length}\nTotal Sales: ${window.KGL.Formatting.formatCurrency(total)}` });
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to load performance stats');
        }
    };

    /* ===== PUBLIC EXPORTS ===== */
    const getHealth = () => 'Good';
    window.KGL.StockCheck = { showStockCheck, showPerformance };
    window.AgentStock = { getHealth };
})();

