/* ===== MANAGER PROCUREMENT MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    /* ===== MODULE HELPERS ===== */
    const payload = (response) => response?.data?.data || response?.data || null;
    /* ===== LOCAL STATE ===== */
    let procurementModal = null;

    /* ===== RESOLVERS ===== */
    const getBranchId = async () => {
        const user = window.KGL.API.config.getCurrentUser();
        const direct = user?.branch?._id || (typeof user?.branch === 'string' ? user.branch.trim() : '');
        const selected = document.getElementById('branchSelector')?.value || '';
        const candidate = direct || selected;
        if (!candidate) return '';
        try {
            const res = await window.KGL.API.get('/branches', { limit: 20 });
            const rows = payload(res)?.items || [];
            const key = String(candidate).toLowerCase().replace(/\s+branch$/, '');
            const found = rows.find((b) =>
                String(b._id || '').toLowerCase() === key ||
                String(b.code || '').toLowerCase().replace(/\s+branch$/, '') === key ||
                String(b.name || '').toLowerCase().replace(/\s+branch$/, '') === key
            );
            if (found?._id) return found._id;
        } catch {
            // Fall through.
        }
        // Fallback to dropdown value so backend can resolve by code/name.
        if (selected) return selected;
        return candidate;
    };

    const inferProduceType = (name) => {
        const key = String(name || '').trim().toLowerCase();
        if (['beans', 'cowpeas'].includes(key)) return 'legume';
        if (['maize'].includes(key)) return 'grain';
        if (['groundnuts', 'g-nuts', 'gnuts'].includes(key)) return 'oilseed';
        return 'other';
    };

    const resolveProduceIdByName = async (name) => {
        const aliasKey = String(name || '').trim().toLowerCase();
        const aliasMap = {
            gnuts: 'groundnuts',
            'g-nuts': 'groundnuts',
            'ground nuts': 'groundnuts',
            'cow peas': 'cowpeas',
            'grain maize': 'maize'
        };
        const normalizedName = aliasMap[aliasKey] || aliasKey;
        const inventoryRes = await window.KGL.API.get('/inventory', { limit: 200 });
        const items = payload(inventoryRes)?.items || [];
        const found = items.find((row) => {
            const produce = row.produce || {};
            const produceName = String(produce.name || '').toLowerCase();
            const produceCode = String(produce.code || '').toLowerCase();
            return produceName === normalizedName || produceCode === normalizedName;
        });
        return found?.produce?._id || '';
    };

    /* ===== PROCUREMENT MODAL UI ===== */
    const ensureProcurementModal = () => {
        if (procurementModal) return procurementModal;
        const host = document.createElement('div');
        host.id = 'kgl-proc-modal';
        host.style.cssText = [
            'position:fixed',
            'inset:0',
            'display:none',
            'align-items:center',
            'justify-content:center',
            'background:rgba(8,14,28,0.6)',
            'z-index:9000',
            'padding:18px'
        ].join(';');

        host.innerHTML = `
            <div style="width:min(430px,88vw);max-height:72vh;overflow:auto;background:#f8fbff;border:1px solid #d5deea;border-radius:12px;box-shadow:0 14px 28px rgba(2,10,25,0.22);font-family:Inter,system-ui,-apple-system,sans-serif;color:#102440;">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #dde6f2;background:#ffffff;">
                    <h3 style="margin:0;font-size:20px;font-weight:700;">New Procurement</h3>
                    <button data-action="close" type="button" style="border:none;background:transparent;color:#5d7593;font-size:18px;cursor:pointer;">x</button>
                </div>
                <div style="padding:10px 12px;display:grid;gap:8px;">
                    <label style="display:grid;gap:4px;">
                        <span style="font-weight:700;color:#1d3553;font-size:13px;">Produce</span>
                        <input id="kgl-produce" type="text" placeholder="Beans, Maize, Groundnuts..." style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-weight:700;color:#1d3553;font-size:13px;">Quantity (kg)</span>
                        <input id="kgl-quantity" type="number" min="1" step="1" placeholder="1000" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-weight:700;color:#1d3553;font-size:13px;">Total Cost (UGX)</span>
                        <input id="kgl-cost" type="number" min="1" step="1" placeholder="1500000" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-weight:700;color:#1d3553;font-size:13px;">Supplier / Dealer Name</span>
                        <input id="kgl-supplier" type="text" placeholder="John Doe" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-weight:700;color:#1d3553;font-size:13px;">Supplier Contact</span>
                        <input id="kgl-contact" type="tel" placeholder="+2567XXXXXXXX" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-weight:700;color:#1d3553;font-size:13px;">Sale Price (UGX/kg)</span>
                        <input id="kgl-sale-price" type="number" min="1" step="1" placeholder="3500" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;border-top:1px solid #dde6f2;background:#ffffff;">
                    <button data-action="cancel" type="button" style="background:#ffffff;color:#1e3552;border:1px solid #c9d6e4;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Cancel</button>
                    <button data-action="save" type="button" style="background:#1f7a34;color:#ffffff;border:none;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(host);
        procurementModal = host;
        return host;
    };

    const openProcurementModal = () => {
        const modal = ensureProcurementModal();
        modal.style.display = 'flex';
        modal.querySelector('#kgl-produce').focus();
        return modal;
    };

    const closeProcurementModal = () => {
        if (!procurementModal) return;
        procurementModal.style.display = 'none';
    };

    /* ===== PROCUREMENT ACTIONS ===== */
    const showNewProcurementForm = async () => {
        try {
            const modal = openProcurementModal();
            modal.querySelector('#kgl-produce').value = '';
            modal.querySelector('#kgl-quantity').value = '';
            modal.querySelector('#kgl-cost').value = '';
            modal.querySelector('#kgl-supplier').value = '';
            modal.querySelector('#kgl-contact').value = '';
            modal.querySelector('#kgl-sale-price').value = '';
            const onClose = () => {
                modal.querySelectorAll('button').forEach((btn) => btn.replaceWith(btn.cloneNode(true)));
            };
            const bind = (selector, handler) => {
                const old = modal.querySelector(selector);
                const fresh = old.cloneNode(true);
                old.replaceWith(fresh);
                fresh.addEventListener('click', handler);
            };

            bind('[data-action="close"]', () => {
                closeProcurementModal();
                onClose();
            });
            bind('[data-action="cancel"]', () => {
                closeProcurementModal();
                onClose();
            });
            bind('[data-action="save"]', async () => {
                try {
                    const produceName = modal.querySelector('#kgl-produce')?.value?.trim() || '';
                    const quantityKg = Number(modal.querySelector('#kgl-quantity')?.value || 0);
                    const totalCost = Number(modal.querySelector('#kgl-cost')?.value || 0);
                    const supplierName = modal.querySelector('#kgl-supplier')?.value?.trim() || '';
                    const supplierContactRaw = modal.querySelector('#kgl-contact')?.value?.trim() || '';
                    const supplierContact = supplierContactRaw.replace(/\s+/g, '');
                    const salePrice = Number(modal.querySelector('#kgl-sale-price')?.value || 0);

                    if (!produceName || !supplierName || !supplierContact || quantityKg <= 0 || totalCost <= 0 || salePrice <= 0) {
                        window.KGL.Alerts.showError('Produce, supplier, contact, quantity, total cost and sale price are required');
                        return;
                    }

                    if (!/^\+?[0-9]{9,15}$/.test(supplierContact)) {
                        window.KGL.Alerts.showError('Supplier contact must be 9-15 digits (optionally starting with +).');
                        return;
                    }

                    const produceId = await resolveProduceIdByName(produceName);
                    const branch = await getBranchId();
                    if (!branch) return window.KGL.Alerts.showError('Could not resolve branch. Please refresh and retry.');

                    const body = {
                        branch,
                        // Send both ID and name so backend can resolve either path.
                        ...(produceId ? { produce: produceId } : {}),
                        produceName,
                        produceType: inferProduceType(produceName),
                        supplierName,
                        supplierContact,
                        quantityKg,
                        unitCost: totalCost / quantityKg,
                        salePrice,
                        procurementDate: new Date().toISOString()
                    };

                    await window.KGL.API.post('/procurements', body);

                    closeProcurementModal();
                    onClose();
                    window.KGL.Alerts.showSuccess('Procurement saved');
                    window.KGL.ManagerDashboard?.refreshData?.();
                } catch (error) {
                    window.KGL.Alerts.showError(error.message || 'Failed to save procurement');
                }
            });
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to save procurement');
        }
    };

    const showAllProcurements = async () => {
        try {
            const branch = await getBranchId();
            const res = await window.KGL.API.get('/procurements', { branch, limit: 100 });
            const rows = payload(res)?.items || [];
            const text = rows.map((r) => `${new Date(r.procurementDate).toLocaleDateString()} - ${r.produce?.name || '-'} - ${r.quantityKg}kg - ${window.KGL.Formatting.formatCurrency(r.totalCost || 0)}`).join('\n') || 'No procurements yet';
            await window.KGL.Alerts.showAlert({ title: 'Procurement Records', message: text });
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to load procurements');
        }
    };

    window.KGL.Procurement = { showNewProcurementForm, showAllProcurements };
})();

