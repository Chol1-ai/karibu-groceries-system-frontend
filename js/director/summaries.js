/* ===== DIRECTOR SUMMARIES MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    const payload = (response) => response?.data?.data || response?.data || null;

    const showSalesSummary = async () => {
        const res = await window.KGL.API.get('/analytics/summaries/sales');
        const data = payload(res) || {};
        await window.KGL.Alerts.showAlert({ title: 'Sales Summary', message: `Total Sales: ${window.KGL.Formatting.formatCurrency(data.totalSales || 0)}\nVolume: ${window.KGL.Formatting.formatWeight(data.totalVolume || 0)}\nTransactions: ${data.transactions || 0}` });
    };

    const showProcurementSummary = async () => {
        const res = await window.KGL.API.get('/analytics/summaries/procurement');
        const data = payload(res) || {};
        await window.KGL.Alerts.showAlert({ title: 'Procurement Summary', message: `Total Cost: ${window.KGL.Formatting.formatCurrency(data.totalCost || 0)}\nVolume: ${window.KGL.Formatting.formatWeight(data.totalVolume || 0)}\nRecords: ${data.procurements || 0}` });
    };

    const showCreditSummary = async () => {
        const res = await window.KGL.API.get('/analytics/summaries/credit');
        const data = payload(res) || {};
        await window.KGL.Alerts.showAlert({ title: 'Credit Summary', message: `Total Due: ${window.KGL.Formatting.formatCurrency(data.totalDue || 0)}\nTotal Paid: ${window.KGL.Formatting.formatCurrency(data.totalPaid || 0)}\nOutstanding: ${window.KGL.Formatting.formatCurrency(data.outstanding || 0)}` });
    };

    window.KGL.DirectorSummaries = { showSalesSummary, showProcurementSummary, showCreditSummary };
})();

