/* ===== MANAGER SALES VIEW MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    const payload = (response) => response?.data?.data || response?.data || null;
    const getUser = () => window.KGL.API.config.getCurrentUser() || {};
    const productAlias = (value) => {
        const key = String(value || '').trim().toLowerCase();
        if (key === 'gnuts' || key === 'g-nuts' || key === 'ground nuts') return 'groundnuts';
        if (key === 'grain maize') return 'maize';
        if (key === 'cow peas') return 'cowpeas';
        return key;
    };
    const getBranch = () => getUser()?.branch?._id || getUser()?.branch || '';
    const getBranchCandidate = () => {
        const selected = document.getElementById('branchSelector')?.value;
        if (selected) return selected;
        const direct = getBranch();
        if (direct) return direct;
        return '';
    };
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
    let saleModal = null;

    const resolveProduceByInput = async (input) => {
        const branch = await resolveBranchId();
        const res = await window.KGL.API.get('/inventory', { branch, limit: 300 });
        const rows = payload(res)?.items || [];
        return rows.find((r) => {
            const p = r.produce || {};
            const key = productAlias(input);
            return productAlias(p.name) === key || productAlias(p.code) === key;
        }) || null;
    };

    const ensureSaleModal = () => {
        if (saleModal) return saleModal;
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:86px;right:20px;display:none;z-index:9001;';
        modal.innerHTML = `
            <div style="width:min(380px,88vw);max-height:72vh;overflow:auto;background:#f8fbff;border:1px solid #d4deea;border-radius:12px;box-shadow:0 14px 28px rgba(2,10,25,.22);font-family:Inter,system-ui;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#fff;border-bottom:1px solid #dde6f2;">
                    <h3 style="margin:0;font:700 17px Inter,system-ui;color:#102a4d;">Record Sale</h3>
                    <button id="kgl-sale-close" type="button" style="border:none;background:transparent;font-size:18px;color:#5d7593;cursor:pointer;">x</button>
                </div>
                <div style="padding:10px 12px;display:grid;gap:8px;">
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Produce</span>
                        <input id="kgl-sale-produce" type="text" placeholder="beans / maize / groundnuts" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Quantity (kg)</span>
                        <input id="kgl-sale-qty" type="number" min="1" step="1" placeholder="10" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Unit Price (UGX/kg)</span>
                        <input id="kgl-sale-price" type="number" min="1" step="1" placeholder="Auto from product if blank" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Buyer Name</span>
                        <input id="kgl-sale-buyer" type="text" placeholder="Enter buyer name" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;background:#fff;border-top:1px solid #dde6f2;">
                    <button id="kgl-sale-cancel" type="button" style="background:#fff;color:#1e3552;border:1px solid #c9d6e4;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Cancel</button>
                    <button id="kgl-sale-save" type="button" style="background:#1f7a34;color:#fff;border:none;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        saleModal = modal;
        return modal;
    };

    const showReport = async () => {
        try {
            const branch = await resolveBranchId();
            const res = await window.KGL.API.get('/sales', { branch, limit: 100 });
            const rows = payload(res)?.items || [];
            const total = rows.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
            const volume = rows.reduce((sum, r) => sum + Number(r.quantityKg || 0), 0);
            const message = `Total Sales: ${window.KGL.Formatting.formatCurrency(total)}\nTotal Volume: ${window.KGL.Formatting.formatWeight(volume)}\nTransactions: ${rows.length}`;
            await window.KGL.Alerts.showAlert({ title: 'Sales Report', message });
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to load sales report');
        }
    };

    const recordSale = async () => {
        try {
            const modal = ensureSaleModal();
            modal.style.display = 'block';
            const close = () => { modal.style.display = 'none'; };

            modal.querySelector('#kgl-sale-produce').value = '';
            modal.querySelector('#kgl-sale-qty').value = '';
            modal.querySelector('#kgl-sale-price').value = '';
            modal.querySelector('#kgl-sale-buyer').value = '';

            modal.querySelector('#kgl-sale-close').onclick = close;
            modal.querySelector('#kgl-sale-cancel').onclick = close;

            modal.querySelector('#kgl-sale-save').onclick = async () => {
                try {
                    const produceInput = (modal.querySelector('#kgl-sale-produce').value || '').trim();
                    const quantityKg = Number(modal.querySelector('#kgl-sale-qty').value || 0);
                    const priceInput = (modal.querySelector('#kgl-sale-price').value || '').trim();
                    const buyerName = (modal.querySelector('#kgl-sale-buyer').value || '').trim();

                    if (!produceInput) return window.KGL.Alerts.showError('Produce is required');
                    if (!Number.isFinite(quantityKg) || quantityKg <= 0) return window.KGL.Alerts.showError('Quantity must be a positive number');
                    if (buyerName.length < 2) return window.KGL.Alerts.showError('Buyer name must be at least 2 characters');

                    const branch = await resolveBranchId();
                    if (!branch) return window.KGL.Alerts.showError('Could not resolve branch. Please refresh and retry.');

                    const row = await resolveProduceByInput(produceInput);
                    if (!row?.produce?._id) return window.KGL.Alerts.showError('Produce not found in branch inventory');

                    const defaultPrice = Number(row.produce.defaultSellingPrice || 0);
                    const unitPrice = priceInput === '' ? defaultPrice : Number(priceInput);
                    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return window.KGL.Alerts.showError('Unit price must be a positive number');

                    const user = getUser();
                    await window.KGL.API.post('/sales', {
                        branch,
                        produce: row.produce._id,
                        agent: user._id,
                        buyerName,
                        quantityKg,
                        unitPrice,
                        saleType: 'cash',
                        paymentMethod: 'cash',
                        status: 'completed'
                    });

                    close();
                    window.KGL.Alerts.showSuccess('Sale recorded');
                    window.KGL.ManagerDashboard?.refreshData?.();
                } catch (error) {
                    window.KGL.Alerts.showError(error.message || 'Failed to record sale');
                }
            };
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to record sale');
        }
    };

    window.KGL.SalesView = { showReport, recordSale };
})();

