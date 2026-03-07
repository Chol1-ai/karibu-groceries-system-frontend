/* ===== ALERT UTILITIES ===== */
window.KGL = window.KGL || {};

(function() {
    let modalBackdrop = null;
    let modalCard = null;

    const getContainer = () => {
        let node = document.getElementById('kgl-toast-container');
        if (!node) {
            node = document.createElement('div');
            node.id = 'kgl-toast-container';
            node.style.cssText = 'position:fixed;top:20px;right:20px;z-index:20000;display:flex;flex-direction:column;gap:8px;max-width:480px;';
            document.body.appendChild(node);
        }
        return node;
    };

    const toast = (message, color = '#3b82f6', duration = 8000) => {
        const el = document.createElement('div');
        el.style.cssText = `background:#fff;border-left:4px solid ${color};padding:12px 14px;border-radius:8px;box-shadow:0 8px 18px rgba(0,0,0,.15);font-size:14px;color:#1f2937;`;
        el.textContent = message;
        getContainer().appendChild(el);
        if (duration > 0) setTimeout(() => el.remove(), duration);
        return el;
    };

    const ensureModal = () => {
        if (modalBackdrop && modalCard) return;

        modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'kgl-modal-backdrop';
        modalBackdrop.style.cssText = [
            'position:fixed',
            'inset:0',
            'background:rgba(7,13,27,0.55)',
            'display:none',
            'align-items:center',
            'justify-content:center',
            'z-index:25000',
            'padding:20px'
        ].join(';');

        modalCard = document.createElement('div');
        modalCard.id = 'kgl-modal-card';
        modalCard.style.cssText = [
            'width:min(460px,88vw)',
            'max-height:72vh',
            'overflow:auto',
            'background:#f8fbff',
            'border:1px solid #d4deea',
            'border-radius:12px',
            'box-shadow:0 14px 28px rgba(2,10,25,0.22)',
            'color:#102440',
            'font-family:Inter,system-ui,-apple-system,sans-serif'
        ].join(';');

        modalBackdrop.appendChild(modalCard);
        document.body.appendChild(modalBackdrop);
    };

    const hideModal = () => {
        if (modalBackdrop) modalBackdrop.style.display = 'none';
        if (modalCard) modalCard.innerHTML = '';
    };

    const buildContent = (message) => {
        const fragment = document.createDocumentFragment();
        const lines = String(message || '').split('\n').map((x) => x.trim()).filter(Boolean);
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;gap:8px;';

        lines.forEach((line) => {
            const idx = line.indexOf(':');
            if (idx > 0) {
                const label = line.slice(0, idx).trim();
                const value = line.slice(idx + 1).trim();
                const row = document.createElement('div');
                row.style.cssText = 'display:grid;grid-template-columns:minmax(110px,150px) 1fr;gap:8px;padding:8px 10px;background:#ffffff;border:1px solid #dfe8f3;border-radius:8px;';

                const key = document.createElement('div');
                key.style.cssText = 'font-weight:700;color:#1f3a5a;font-size:13px;';
                key.textContent = label;

                const val = document.createElement('div');
                val.style.cssText = 'font-weight:600;color:#0d2746;word-break:break-word;font-size:13px;';
                val.textContent = value;

                row.appendChild(key);
                row.appendChild(val);
                grid.appendChild(row);
                return;
            }

            const paragraph = document.createElement('div');
            paragraph.style.cssText = 'padding:9px 10px;background:#ffffff;border:1px solid #dfe8f3;border-radius:8px;font-weight:600;color:#0d2746;font-size:13px;';
            paragraph.textContent = line;
            grid.appendChild(paragraph);
        });

        fragment.appendChild(grid);
        return fragment;
    };

    const showModal = ({ title = 'Alert', message = '', okLabel = 'Close', onConfirm = null, onCancel = null, showCancel = false }) => {
        ensureModal();

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #dde6f2;background:#ffffff;position:sticky;top:0;';

        const heading = document.createElement('h3');
        heading.style.cssText = 'margin:0;font-size:20px;color:#102a4d;font-weight:700;';
        heading.textContent = title;

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = 'x';
        closeBtn.style.cssText = 'border:none;background:transparent;color:#5d7593;font-size:18px;cursor:pointer;line-height:1;padding:2px 6px;';

        header.appendChild(heading);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.style.cssText = 'padding:10px 12px;display:grid;gap:8px;';
        body.appendChild(buildContent(message));

        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;border-top:1px solid #dde6f2;background:#ffffff;position:sticky;bottom:0;';

        const okButton = document.createElement('button');
        okButton.type = 'button';
        okButton.textContent = okLabel;
        okButton.style.cssText = 'background:#1f7a34;color:#ffffff;border:none;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = 'background:#ffffff;color:#1e3552;border:1px solid #c9d6e4;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;';

        footer.appendChild(okButton);
        if (showCancel) footer.appendChild(cancelButton);

        modalCard.innerHTML = '';
        modalCard.appendChild(header);
        modalCard.appendChild(body);
        modalCard.appendChild(footer);
        modalBackdrop.style.display = 'flex';

        const closeAll = () => hideModal();

        closeBtn.onclick = () => {
            closeAll();
            if (onCancel) onCancel();
        };
        okButton.onclick = () => {
            closeAll();
            if (onConfirm) onConfirm();
        };
        cancelButton.onclick = () => {
            closeAll();
            if (onCancel) onCancel();
        };

        modalBackdrop.onclick = (e) => {
            if (e.target !== modalBackdrop) return;
            closeAll();
            if (onCancel) onCancel();
        };
    };

    let loadingToast = null;

    window.KGL.Alerts = {
        showToast: (m) => toast(m),
        showSuccess: (m) => toast(m, '#10b981', 7000),
        showError: (m) => toast(m, '#ef4444', 15000),
        showWarning: (m) => toast(m, '#f59e0b', 10000),
        showInfo: (m) => toast(m, '#3b82f6', 9000),
        showLoading: (m = 'Loading...') => {
            if (loadingToast) loadingToast.remove();
            loadingToast = toast(m, '#6b7280', 0);
            return loadingToast;
        },
        hideLoading: () => {
            if (loadingToast) loadingToast.remove();
            loadingToast = null;
        },
        showConfirm: async (message) => new Promise((resolve) => {
            showModal({
                title: 'Please Confirm',
                message,
                okLabel: 'Confirm',
                showCancel: true,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        }),
        showAlert: async ({ title = 'Alert', message = '' } = {}) => new Promise((resolve) => {
            showModal({
                title,
                message,
                okLabel: 'Close',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(true)
            });
        })
    };
    window.Alerts = window.KGL.Alerts;
})();

