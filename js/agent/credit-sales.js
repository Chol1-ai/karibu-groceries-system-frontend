/* ===== AGENT CREDIT SALES MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    /* ===== MODULE HELPERS ===== */
    const payload = (response) => response?.data?.data || response?.data || null;
    /* ===== LOCAL STATE ===== */
    let creditModal = null;

    /* ===== NORMALIZERS ===== */
    const productAlias = (value) => {
        const key = String(value || '').trim().toLowerCase();
        if (key === 'gnuts' || key === 'g-nuts' || key === 'ground nuts') return 'groundnuts';
        if (key === 'grain maize') return 'maize';
        if (key === 'cow peas') return 'cowpeas';
        return key;
    };

    /* ===== RESOLVERS ===== */
    const resolveBranchId = async () => {
        const cached = sessionStorage.getItem('kgl_active_branch_id') || localStorage.getItem('kgl_active_branch_id') || '';
        if (cached) return cached;
        const user = window.KGL.API.config.getCurrentUser() || {};
        const selected = document.getElementById('agentBranchSelect')?.value || '';
        if (selected) return selected;
        const direct = user?.branch?._id || user?.branchId || (typeof user?.branch === 'string' ? user.branch : '');
        if (direct) {
            try {
                const branchesRes = await window.KGL.API.get('/branches', { limit: 20 });
                const branches = payload(branchesRes)?.items || [];
                const key = String(direct).toLowerCase().replace(/\s+branch$/, '');
                const found = branches.find((b) =>
                    String(b._id || '').toLowerCase() === key ||
                    String(b.code || '').toLowerCase().replace(/\s+branch$/, '') === key ||
                    String(b.name || '').toLowerCase().replace(/\s+branch$/, '') === key
                );
                if (found?._id) {
                    sessionStorage.setItem('kgl_active_branch_id', found._id);
                    localStorage.setItem('kgl_active_branch_id', found._id);
                    return found._id;
                }
            } catch {
                // continue with direct fallback
            }
            return direct;
        }
        try {
            const profileRes = await window.KGL.API.get('/users/profile');
            const profileUser = payload(profileRes)?.user || {};
            const resolved = profileUser?.branch?._id || profileUser?.branchId || (typeof profileUser?.branch === 'string' ? profileUser.branch : '') || '';
            if (resolved) {
                sessionStorage.setItem('kgl_active_branch_id', resolved);
                localStorage.setItem('kgl_active_branch_id', resolved);
            }
            return resolved;
        } catch {
            return '';
        }
    };

    const resolveProduce = async (produceInput) => {
        const branch = await resolveBranchId();
        if (!branch) return { branch: '', produce: null, item: null };
        const invRes = await window.KGL.API.get('/inventory', { branch, limit: 200 });
        const rows = payload(invRes)?.items || [];
        const key = productAlias(produceInput);
        const found = rows.find((r) => {
            const p = r.produce || {};
            return productAlias(p.name) === key || productAlias(p.code) === key;
        }) || null;
        return { branch, produce: found?.produce || null, item: found };
    };

    /* ===== CREDIT MODAL UI ===== */
    const ensureCreditModal = () => {
        if (creditModal) return creditModal;
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:86px;right:20px;display:none;z-index:26023;';
        modal.innerHTML = `
            <div style="width:min(390px,88vw);max-height:76vh;overflow:auto;background:#f8fbff;border:1px solid #d4deea;border-radius:12px;box-shadow:0 14px 28px rgba(2,10,25,.22);font-family:Inter,system-ui;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#fff;border-bottom:1px solid #dde6f2;">
                    <h3 style="margin:0;font:700 17px Inter,system-ui;color:#102a4d;">New Credit Sale</h3>
                    <button id="kgl-credit-close" type="button" style="border:none;background:transparent;font-size:18px;color:#5d7593;cursor:pointer;">x</button>
                </div>
                <div style="padding:10px 12px;display:grid;gap:8px;">
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Produce</span>
                        <input id="kgl-credit-produce" type="text" placeholder="beans / maize / cowpeas / groundnuts" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Quantity (kg)</span>
                        <input id="kgl-credit-qty" type="number" min="1" step="1" placeholder="10" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Buyer Name</span>
                        <input id="kgl-credit-buyer" type="text" placeholder="Buyer name" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Buyer NIN</span>
                        <input id="kgl-credit-nin" type="text" placeholder="CM12XXXXXXXXXX" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Location</span>
                        <input id="kgl-credit-location" type="text" placeholder="Matugga" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Contact</span>
                        <input id="kgl-credit-contact" type="tel" placeholder="+2567XXXXXXXX" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Amount Due (UGX)</span>
                        <input id="kgl-credit-amount" type="number" min="1" step="1" placeholder="100000" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Due Date</span>
                        <input id="kgl-credit-due-date" type="date" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Dispatch Date</span>
                        <input id="kgl-credit-dispatch-date" type="date" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;background:#fff;border-top:1px solid #dde6f2;">
                    <button id="kgl-credit-cancel" type="button" style="background:#fff;color:#1e3552;border:1px solid #c9d6e4;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Cancel</button>
                    <button id="kgl-credit-save" type="button" style="background:#1f7a34;color:#fff;border:none;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        creditModal = modal;
        return creditModal;
    };

    /* ===== CREDIT SALE ACTION ===== */
    const showNewCreditSaleForm = async () => {
        try {
            const modal = ensureCreditModal();
            modal.style.display = 'block';
            const close = () => { modal.style.display = 'none'; };

            modal.querySelector('#kgl-credit-produce').value = '';
            modal.querySelector('#kgl-credit-qty').value = '';
            modal.querySelector('#kgl-credit-buyer').value = '';
            modal.querySelector('#kgl-credit-nin').value = '';
            modal.querySelector('#kgl-credit-location').value = '';
            modal.querySelector('#kgl-credit-contact').value = '';
            modal.querySelector('#kgl-credit-amount').value = '';
            modal.querySelector('#kgl-credit-due-date').value = new Date().toISOString().slice(0, 10);
            modal.querySelector('#kgl-credit-dispatch-date').value = new Date().toISOString().slice(0, 10);

            modal.querySelector('#kgl-credit-close').onclick = close;
            modal.querySelector('#kgl-credit-cancel').onclick = close;
            modal.querySelector('#kgl-credit-save').onclick = async () => {
                const produceInput = (modal.querySelector('#kgl-credit-produce').value || '').trim();
                const quantityKg = Number(modal.querySelector('#kgl-credit-qty').value || 0);
                const buyerName = (modal.querySelector('#kgl-credit-buyer').value || '').trim();
                const nin = (modal.querySelector('#kgl-credit-nin').value || '').trim();
                const location = (modal.querySelector('#kgl-credit-location').value || '').trim();
                const contact = (modal.querySelector('#kgl-credit-contact').value || '').trim();
                const amountDue = Number(modal.querySelector('#kgl-credit-amount').value || 0);
                const dueDate = (modal.querySelector('#kgl-credit-due-date').value || '').trim();
                const dispatchDate = (modal.querySelector('#kgl-credit-dispatch-date').value || '').trim();

                if (!produceInput || !buyerName || !nin || !location || !contact || !dueDate || !dispatchDate) {
                    return window.KGL.Alerts.showError('Produce, buyer, NIN, location, contact, due date and dispatch date are required');
                }
                if (!Number.isFinite(quantityKg) || quantityKg <= 0) return window.KGL.Alerts.showError('Quantity must be positive');
                if (!Number.isFinite(amountDue) || amountDue <= 0) return window.KGL.Alerts.showError('Amount due must be positive');

                const user = window.KGL.API.config.getCurrentUser() || {};
                const resolved = await resolveProduce(produceInput);
                if (!resolved.branch) return window.KGL.Alerts.showError('Could not resolve branch. Please login again.');
                if (!resolved.produce?._id) return window.KGL.Alerts.showError('Produce not found in your branch inventory');

                const available = Number(resolved.item?.availableStock ?? resolved.item?.currentStock ?? 0);
                if (available <= 0) return window.KGL.Alerts.showError('Selected produce is out of stock');
                if (quantityKg > available) return window.KGL.Alerts.showError(`Insufficient stock. Available: ${available} kg`);

                await window.KGL.API.post('/credit-sales', {
                    branch: resolved.branch,
                    produce: resolved.produce._id,
                    agent: user._id,
                    buyerName,
                    nin,
                    location,
                    contact,
                    quantityKg,
                    amountDue,
                    amountPaid: 0,
                    dueDate,
                    dispatchDate
                });

                close();
                window.KGL.Alerts.showSuccess('Credit sale recorded');
                window.KGL.AgentDashboard?.refreshData?.();
            };
        } catch (error) {
            window.KGL.Alerts.showError(error.message || 'Failed to record credit sale');
        }
    };

    /* ===== PUBLIC EXPORTS ===== */
    const getCreditSales = () => 0;
    window.KGL.CreditSales = { showNewCreditSaleForm };
    window.AgentCreditSales = { getCreditSales };
})();

