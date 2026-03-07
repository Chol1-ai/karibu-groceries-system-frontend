/* ===== SHARED NAVBAR MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    function init() {
        const dateNode = document.getElementById('currentDate');
        if (dateNode && window.KGL.Formatting) {
            dateNode.textContent = window.KGL.Formatting.formatCurrentDate();
        }
    }

    document.addEventListener('DOMContentLoaded', init);
    window.KGL.Navbar = { init };
})();

