/* ===== RUNTIME CONFIG =====
 * Preferred on Vercel: keep this empty and use the proxy function:
 *   /api/v1/* -> frontend/api/v1/[...path].js -> Render backend.
 *
 * Optional direct mode: set your backend base URL including /api/v1.
 * Example:
 *   window.KGL_API_BASE_URL = 'https://karibu-api.onrender.com/api/v1';
 */
window.KGL_API_BASE_URL = window.KGL_API_BASE_URL || '';
