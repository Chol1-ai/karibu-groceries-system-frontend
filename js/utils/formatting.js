/* ===== FORMATTING UTILITIES ===== */
window.KGL = window.KGL || {};
window.KGL.Formatting = {
    formatCurrency(value) {
        const amount = Number(value || 0);
        return `UGX ${amount.toLocaleString()}`;
    },
    formatWeight(value) {
        const amount = Number(value || 0);
        return `${amount.toLocaleString()} kg`;
    },
    formatDate(value) {
        const date = value ? new Date(value) : new Date();
        return date.toLocaleDateString();
    },
    formatDateTime(value) {
        const date = value ? new Date(value) : new Date();
        return date.toLocaleString();
    },
    formatCurrentDate() {
        return new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    },
    formatTime(value) {
        const date = value ? new Date(value) : new Date();
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
};
window.Formatting = window.KGL.Formatting;

