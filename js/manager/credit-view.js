/* ===== MANAGER CREDIT VIEW MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    const payload = (response) => response?.data?.data || response?.data || null;

    const showOverview = async () => {
        try {
            const branch = window.KGL.API.config.getCurrentUser()?.branch?._id || window.KGL.API.config.getCurrentUser()?.branch;
            const res = await window.KGL.API.get('/credit-sales/summary', { branch });
            const data = payload(res) || {};
            const msg = `Active Credits: ${data.activeCredits || 0}\nTotal Due: ${window.KGL.Formatting.formatCurrency(data.totalDue || 0)}\nOverdue: ${data.overdueCount || 0}`;
            await window.KGL.Alerts.showAlert({ title: 'Credit Overview', message: msg });
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to load credit overview');
        }
    };

    const showAllCredits = async () => {
        try {
            const branch = window.KGL.API.config.getCurrentUser()?.branch?._id || window.KGL.API.config.getCurrentUser()?.branch;
            const res = await window.KGL.API.get('/credit-sales', { branch, limit: 100 });
            const rows = payload(res)?.items || [];
            const msg = rows.map((r) => `${r.buyerName} - ${window.KGL.Formatting.formatCurrency(Math.max((r.amountDue || 0) - (r.amountPaid || 0), 0))} - due ${window.KGL.Formatting.formatDate(r.dueDate)}`).join('\n') || 'No credit records';
            await window.KGL.Alerts.showAlert({ title: 'Credit Sales', message: msg });
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to load credit sales');
        }
    };

    window.KGL.CreditView = { showOverview, showAllCredits };
})();

