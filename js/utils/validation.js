/* ===== VALIDATION UTILITIES ===== */
window.KGL = window.KGL || {};
window.KGL.Validation = {
    isEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')),
    isPositive: (v) => Number(v) > 0,
    isRequired: (v) => String(v || '').trim().length > 0,
    isPhone: (v) => /^\+?[0-9]{9,15}$/.test(String(v || '').trim())
};
window.Validation = window.KGL.Validation;

