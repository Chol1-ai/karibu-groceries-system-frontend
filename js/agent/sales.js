/* ===== AGENT CASH SALES MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    /* ===== MODULE HELPERS ===== */
    const payload = (response) => response?.data?.data || response?.data || null;
    /* ===== LOCAL STATE ===== */
    let saleModal = null;

    /* ===== NORMALIZERS ===== */
    const productAlias = (value) => {
        const key = String(value || '').trim().toLowerCase();
        if (key === 'gnuts' || key === 'g-nuts' || key === 'ground nuts') return 'groundnuts';
        if (key === 'grain maize') return 'maize';
        if (key === 'cow peas') return 'cowpeas';
        return key;
    };

    /* ===== RESOLVERS ===== */
    const resolveProduce = async (name) => {
        const branch = await resolveBranchId();
        const res = await window.KGL.API.get('/inventory', { branch, limit: 300 });
        const rows = payload(res)?.items || [];
        const inputKey = productAlias(name);
        const found = rows.find((r) => {
            const p = r.produce || {};
            return productAlias(p.name) === inputKey || productAlias(p.code) === inputKey;
        });
        return found ? { produce: found.produce, item: found } : null;
    };

    const resolveBranchId = async () => {
        const cached = sessionStorage.getItem('kgl_active_branch_id') || localStorage.getItem('kgl_active_branch_id') || '';
        if (cached) return cached;
        const user = window.KGL.API.config.getCurrentUser() || {};
        const selected = document.getElementById('agentBranchSelect')?.value || '';
        const direct = user?.branch?._id || user?.branchId || (typeof user?.branch === 'string' ? user.branch : '');
        const branchNameText = (document.getElementById('agentBranchSelect')?.selectedOptions?.[0]?.textContent || '').replace(/\s+Branch$/i, '').trim();
        const candidate = selected || direct || branchNameText;
        if (candidate) {
            try {
                const branchesRes = await window.KGL.API.get('/branches', { limit: 20 });
                const branches = payload(branchesRes)?.items || [];
                const key = String(candidate).toLowerCase().replace(/\s+branch$/, '');
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
                // fall through
            }
            return candidate;
        }
        try {
            const profileRes = await window.KGL.API.get('/users/profile');
            const profileUser = payload(profileRes)?.user || {};
            const branch = profileUser?.branch?._id || profileUser?.branchId || (typeof profileUser?.branch === 'string' ? profileUser.branch : '');
            if (branch) {
                const raw = localStorage.getItem('kgl_auth') || sessionStorage.getItem('kgl_auth');
                if (raw) {
                    const auth = JSON.parse(raw);
                    auth.user = { ...(auth.user || {}), branch: profileUser.branch || branch };
                    localStorage.setItem('kgl_auth', JSON.stringify(auth));
                    sessionStorage.setItem('kgl_auth', JSON.stringify(auth));
                }
            }
            return branch || '';
        } catch {
            return '';
        }
    };

    /* ===== SALE MODAL UI ===== */
    const ensureSaleModal = () => {
        if (saleModal) return saleModal;
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:86px;right:20px;display:none;z-index:26022;';
        modal.innerHTML = `
            <div style="width:min(380px,88vw);max-height:72vh;overflow:auto;background:#f8fbff;border:1px solid #d4deea;border-radius:12px;box-shadow:0 14px 28px rgba(2,10,25,.22);font-family:Inter,system-ui;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#fff;border-bottom:1px solid #dde6f2;">
                    <h3 style="margin:0;font:700 17px Inter,system-ui;color:#102a4d;">New Sale</h3>
                    <button id="kgl-agent-sale-close" type="button" style="border:none;background:transparent;font-size:18px;color:#5d7593;cursor:pointer;">x</button>
                </div>
                <div style="padding:10px 12px;display:grid;gap:8px;">
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Produce</span>
                        <input id="kgl-agent-sale-produce" type="text" placeholder="beans / maize / cowpeas / groundnuts" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Quantity (kg)</span>
                        <input id="kgl-agent-sale-qty" type="number" min="1" step="1" placeholder="10" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                    <label style="display:grid;gap:4px;">
                        <span style="font-size:13px;font-weight:700;color:#1d3553;">Buyer Name</span>
                        <input id="kgl-agent-sale-buyer" type="text" placeholder="Enter buyer name" autocomplete="off" style="height:32px;border:1px solid #cfdced;border-radius:8px;padding:0 10px;font-size:13px;">
                    </label>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;padding:8px 12px;background:#fff;border-top:1px solid #dde6f2;">
                    <button id="kgl-agent-sale-cancel" type="button" style="background:#fff;color:#1e3552;border:1px solid #c9d6e4;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Cancel</button>
                    <button id="kgl-agent-sale-save" type="button" style="background:#1f7a34;color:#fff;border:none;border-radius:8px;padding:7px 10px;font-weight:700;font-size:12px;cursor:pointer;">Save</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        saleModal = modal;
        return saleModal;
    };

    /* ===== SALE ACTIONS ===== */
    const saveSale = async (saleType = 'cash', prefillProduct = '') => {
        const modal = ensureSaleModal();
        modal.style.display = 'block';
        const close = () => { modal.style.display = 'none'; };

        modal.querySelector('#kgl-agent-sale-produce').value = prefillProduct || '';
        modal.querySelector('#kgl-agent-sale-qty').value = '';
        modal.querySelector('#kgl-agent-sale-buyer').value = '';

        modal.querySelector('#kgl-agent-sale-close').onclick = close;
        modal.querySelector('#kgl-agent-sale-cancel').onclick = close;
        modal.querySelector('#kgl-agent-sale-save').onclick = async () => {
            const produceInput = (modal.querySelector('#kgl-agent-sale-produce').value || '').trim();
            const quantityKg = Number(modal.querySelector('#kgl-agent-sale-qty').value || 0);
            const buyerName = (modal.querySelector('#kgl-agent-sale-buyer').value || '').trim();
            if (!produceInput) return window.KGL.Alerts.showError('Produce is required');
            if (quantityKg <= 0) return window.KGL.Alerts.showError('Quantity must be positive');
            if (buyerName.length < 2) return window.KGL.Alerts.showError('Buyer name must be at least 2 characters');

            const user = window.KGL.API.config.getCurrentUser();
            const branch = await resolveBranchId();
            const resolved = await resolveProduce(produceInput);
            if (!branch) return window.KGL.Alerts.showError('Could not resolve branch. Please re-login and retry.');
            if (!resolved?.produce?._id) return window.KGL.Alerts.showError('This produce is not available in your branch stock.');
            const produce = resolved.produce;
            const available = Number(resolved.item?.availableStock ?? resolved.item?.currentStock ?? 0);
            if (available <= 0) return window.KGL.Alerts.showError('Selected produce is out of stock.');
            if (quantityKg > available) return window.KGL.Alerts.showError(`Insufficient stock. Available: ${available} kg`);

            await window.KGL.API.post('/sales', {
                branch,
                produce: produce._id,
                agent: user._id,
                quantityKg,
                unitPrice: Number(produce.defaultSellingPrice || 0),
                buyerName,
                saleType,
                paymentMethod: saleType === 'cash' ? 'cash' : 'other',
                status: 'completed'
            });

            close();
            window.KGL.Alerts.showSuccess('Sale recorded successfully');
            window.KGL.AgentDashboard?.refreshData?.();
        };
    };

    /* ===== PUBLIC ACTIONS ===== */
    const showNewSaleForm = (type = 'cash', prefillProduct = '') => saveSale(type, prefillProduct).catch((e) => window.KGL.Alerts.showError(e.message || 'Failed to save sale'));

    const showSalesHistory = async () => {
        const user = window.KGL.API.config.getCurrentUser();
        const branch =
            sessionStorage.getItem('kgl_active_branch_id') ||
            localStorage.getItem('kgl_active_branch_id') ||
            '';
        const [salesRes, creditRes] = await Promise.all([
            window.KGL.API.get('/sales', { agent: user?._id, limit: 100 }),
            window.KGL.API.get('/credit-sales', { agent: user?._id, branch, limit: 100 })
        ]);
        const salesRows = payload(salesRes)?.items || [];
        const creditRows = payload(creditRes)?.items || [];

        const merged = [
            ...salesRows.map((s) => ({
                when: s.saleDate,
                produce: s.produce?.name || '-',
                quantityKg: s.quantityKg || 0,
                amount: s.totalAmount || 0,
                label: ''
            })),
            ...creditRows.map((c) => ({
                when: c.dispatchDate || c.dueDate,
                produce: c.produce?.name || '-',
                quantityKg: c.quantityKg || 0,
                amount: Math.max(Number(c.amountDue || 0) - Number(c.amountPaid || 0), 0),
                label: ' [Credit]'
            }))
        ].sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));

        const message = merged
            .map(
                (row) =>
                    `${window.KGL.Formatting.formatDateTime(row.when)} - ${row.produce}${row.label} - ${window.KGL.Formatting.formatWeight(row.quantityKg)} - ${window.KGL.Formatting.formatCurrency(row.amount)}`
            )
            .join('\n') || 'No sales found';
        await window.KGL.Alerts.showAlert({ title: 'Sales History', message });
    };

    window.KGL.Sales = { showNewSaleForm, showSalesHistory };
})();
