/* ===== DIRECTOR ANALYTICS MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    const payload = (response) => response?.data?.data || response?.data || null;

    const showBranch = async (branchCode) => {
        try {
            const res = await window.KGL.API.get(`/analytics/branches/${branchCode}`);
            const data = payload(res) || {};
            const totals = data.totals || {};
            const msg = `Revenue: ${window.KGL.Formatting.formatCurrency(totals.revenue || 0)}\nSales Volume: ${window.KGL.Formatting.formatWeight(totals.volumeKg || 0)}\nProcurements: ${window.KGL.Formatting.formatWeight(totals.procurementsKg || 0)}\nCredit Outstanding: ${window.KGL.Formatting.formatCurrency(totals.creditOutstanding || 0)}`;
            await window.KGL.Alerts.showAlert({ title: `${data.branch?.name || branchCode} Branch Details`, message: msg });
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to load branch details');
        }
    };

    window.KGL.DirectorAnalytics = { showBranch };
})();

