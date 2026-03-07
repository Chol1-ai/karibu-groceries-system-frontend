/* ===== DIRECTOR CHARTS MODULE ===== */
window.KGL = window.KGL || {};

(function() {
    const payload = (response) => response?.data?.data || response?.data || null;
    const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];
    let productRows = [];

    const byKey = (mode) => mode === 'volume' ? 'volumeKg' : 'amount';
    const fmtValue = (mode, value) => {
        if (mode === 'volume') return window.KGL.Formatting.formatWeight(value);
        return window.KGL.Formatting.formatCurrency(value);
    };

    const renderProductChart = (mode = 'revenue') => {
        const donut = document.getElementById('productDonut');
        const totalNode = document.getElementById('productDonutTotal');
        const legend = document.getElementById('productLegend');
        if (!donut || !totalNode || !legend) return;

        const key = byKey(mode);
        const normalized = (productRows || [])
            .map((row) => ({ product: row.product || 'Unknown', value: Number(row[key] || 0) }))
            .filter((row) => row.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        const total = normalized.reduce((sum, row) => sum + row.value, 0);
        if (total <= 0 || normalized.length === 0) {
            donut.style.background = 'conic-gradient(#cbd5e1 0 100%)';
            totalNode.textContent = mode === 'volume' ? '0 kg' : 'UGX 0';
            legend.innerHTML = '<div style="font-size:12px;color:#64748b;">No chart data available</div>';
            return;
        }

        let start = 0;
        const parts = normalized.map((row, i) => {
            const pct = (row.value / total) * 100;
            const end = start + pct;
            const color = COLORS[i % COLORS.length];
            const part = `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
            start = end;
            return { ...row, pct, color, part };
        });

        donut.style.background = `conic-gradient(${parts.map((p) => p.part).join(', ')})`;
        totalNode.textContent = fmtValue(mode, total);
        legend.innerHTML = parts.map((item) => `
            <div class="product-legend-item">
                <div class="product-legend-head">
                    <span class="product-legend-name">
                        <span class="product-swatch" style="background:${item.color};"></span>
                        ${item.product}
                    </span>
                    <span>${item.pct.toFixed(1)}% (${fmtValue(mode, item.value)})</span>
                </div>
                <div class="product-track">
                    <div class="product-fill" style="width:${item.pct.toFixed(2)}%;background:${item.color};"></div>
                </div>
            </div>
        `).join('');
    };

    const loadCharts = async () => {
        try {
            const [productRes, trendRes] = await Promise.all([
                window.KGL.API.get('/analytics/charts/product-performance'),
                window.KGL.API.get('/analytics/charts/trend')
            ]);
            productRows = payload(productRes) || [];
            const mode = (document.getElementById('productChartFilter')?.value || 'revenue') === 'volume' ? 'volume' : 'revenue';
            renderProductChart(mode);
            const trend = payload(trendRes) || [];
            console.log('Trend chart data', trend);
        } catch (error) {
            console.warn('Charts fallback:', error.message);
            renderProductChart('revenue');
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('productChartFilter')?.addEventListener('change', (e) => {
            const mode = e.target.value === 'volume' ? 'volume' : 'revenue';
            renderProductChart(mode);
        });
        loadCharts();
    });
    window.KGL.DirectorCharts = { loadCharts, renderProductChart };
})();

