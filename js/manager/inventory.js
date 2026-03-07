/* ===== MANAGER INVENTORY MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    /* ===== MODULE HELPERS ===== */
    const payload = (response) => response?.data?.data || response?.data || null;
    const getUser = () => window.KGL.API.config.getCurrentUser() || {};
    const getBranch = () => getUser()?.branch?._id || getUser()?.branch || '';
    /* ===== BRANCH CONTEXT ===== */
    const getBranchCandidate = () => {
        const selected = document.getElementById('branchSelector')?.value;
        if (selected) return selected;
        const direct = getBranch();
        if (direct) return direct;
        return '';
    };
    /* ===== LOCAL STATE ===== */
    let stockModal = null;

    /* ===== RESOLVERS ===== */
    const resolveBranchId = async () => {
        const direct = getBranchCandidate();
        if (!direct) return '';
        if (String(direct).startsWith('b_')) return direct;
        try {
            const res = await window.KGL.API.get('/branches', { limit: 20 });
            const rows = payload(res)?.items || [];
            const key = String(direct).toLowerCase().replace(/\s+branch$/, '');
            const found = rows.find((b) =>
                String(b._id || '').toLowerCase() === key ||
                String(b.code || '').toLowerCase().replace(/\s+branch$/, '') === key ||
                String(b.name || '').toLowerCase().replace(/\s+branch$/, '') === key
            );
            return found?._id || direct;
        } catch {
            return direct;
        }
    };

    const fetchBranchInventory = async () => {
        const branch = await resolveBranchId();
        const res = await window.KGL.API.get('/inventory', { branch, limit: 300 });
        return payload(res)?.items || [];
    };

    const resolveItem = async (input) => {
        const items = await fetchBranchInventory();
        const key = String(input || '').trim().toLowerCase();
        return items.find((r) => {
            const p = r.produce || {};
            return String(p.name || '').toLowerCase() === key || String(p.code || '').toLowerCase() === key;
        }) || null;
    };

    /* ===== STOCK MODAL UI ===== */
    const ensureStockModal = () => {
        if (stockModal) return stockModal;
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:86px;right:20px;display:none;z-index:9001;';
        modal.innerHTML = `
            <div style="width:min(380px,88vw);max-height:72vh;overflow:auto;background:#f8fbff;border:1px solid #d4deea;border-radius:12px;box-shadow:0 14px 28px rgba(2,10,25,.22);font-family:Inter,system-ui;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#fff;border-bottom:1px solid #dde6f2;">
                    <h3 style="margin:0;font:700 17px Inter,system-ui;color:#102a4d;">Manage Stock & Price</h3>
                    <button id="kgl-stock-close" type="button" style="border:none;background:transparent;font-size:18px;color:#5d7593;cursor:pointer;">x</button>
                </div>
                <div style="padding:10px 12px;display:grid;gap:8px;">
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Produce</span>
                        <input id="kgl-stock-produce" type="text" placeholder="beans / maize / groundnuts" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Adjustment Type</span>
                        <select id="kgl-stock-action" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                            <option value="add">Add</option>
                            <option value="subtract">Subtract</option>
                        </select>
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Quantity (kg)</span>
                        <input id="kgl-stock-qty" type="number" min="1" step="1" placeholder="100" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Optional New Price (UGX/kg)</span>
                        <input id="kgl-stock-price" type="number" min="0" step="1" placeholder="Leave blank to keep current" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;background:#fff;border-top:1px solid #dde6f2;">
                    <button id="kgl-stock-cancel" type="button" style="background:#fff;color:#1e3552;border:1px solid #c9d6e4;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Cancel</button>
                    <button id="kgl-stock-save" type="button" style="background:#1f7a34;color:#fff;border:none;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        stockModal = modal;
        return modal;
    };

    /* ===== INVENTORY ACTIONS ===== */
    const showInventory = async () => {
        try {
            const branch = await resolveBranchId();
            const res = await window.KGL.API.get('/inventory/available', { branch });
            const rows = payload(res) || [];
            const text = rows.map((r) => `${r.produce?.name || '-'}: ${window.KGL.Formatting.formatWeight(r.availableStock || r.currentStock || 0)} @ ${window.KGL.Formatting.formatCurrency(r.produce?.defaultSellingPrice || 0)}/kg`).join('\n') || 'No inventory records';
            await window.KGL.Alerts.showAlert({ title: 'Inventory', message: text });
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to load inventory');
        }
    };

    const manageStock = async () => {
        try {
            const modal = ensureStockModal();
            modal.style.display = 'block';
            const close = () => { modal.style.display = 'none'; };

            modal.querySelector('#kgl-stock-produce').value = '';
            modal.querySelector('#kgl-stock-action').value = 'add';
            modal.querySelector('#kgl-stock-qty').value = '';
            modal.querySelector('#kgl-stock-price').value = '';

            modal.querySelector('#kgl-stock-close').onclick = close;
            modal.querySelector('#kgl-stock-cancel').onclick = close;

            modal.querySelector('#kgl-stock-save').onclick = async () => {
                try {
                    const produceInput = (modal.querySelector('#kgl-stock-produce').value || '').trim();
                    const adjustmentType = (modal.querySelector('#kgl-stock-action').value || 'add').trim();
                    const quantity = Number(modal.querySelector('#kgl-stock-qty').value || 0);
                    const rawPrice = (modal.querySelector('#kgl-stock-price').value || '').trim();

                    if (!produceInput) return window.KGL.Alerts.showError('Produce is required');
                    if (!Number.isFinite(quantity) || quantity <= 0) return window.KGL.Alerts.showError('Quantity must be positive');

                    const item = await resolveItem(produceInput);
                    if (!item?.produce?._id) return window.KGL.Alerts.showError('Produce not found in branch inventory');

                    let unitPrice;
                    if (rawPrice !== '') {
                        unitPrice = Number(rawPrice);
                        if (!Number.isFinite(unitPrice) || unitPrice <= 0) return window.KGL.Alerts.showError('New price must be positive');
                    }

                    const branch = await resolveBranchId();
                    if (!branch) return window.KGL.Alerts.showError('Could not resolve branch. Please refresh and retry.');

                    await window.KGL.API.post('/inventory/adjust', {
                        branch,
                        produce: item.produce._id,
                        quantity,
                        adjustmentType: adjustmentType === 'subtract' ? 'subtract' : 'add',
                        ...(rawPrice !== '' ? { unitPrice } : {})
                    });

                    close();
                    window.KGL.Alerts.showSuccess('Stock updated');
                    window.KGL.ManagerDashboard?.refreshData?.();
                } catch (error) {
                    window.KGL.Alerts.showError(error.message || 'Failed to update stock');
                }
            };
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to update stock');
        }
    };

    window.KGL.Inventory = { showInventory, manageStock };
})();

