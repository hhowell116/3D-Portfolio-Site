document.addEventListener('DOMContentLoaded', () => {

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentView = 'monthly';
let currentDataset = 'retail';
let fillRateChart, ordersChart;
let isLoading = false;

function parseDate(dateStr) {
    const parts = dateStr.split('/');
    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
}

function n(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const cleaned = val.replace(/,/g, '').replace(/%/g, '').trim();
        const num = parseFloat(cleaned);
        return Number.isFinite(num) ? num : 0;
    }
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
}

function getKpi4Class(rate) {
    if (rate >= 85) return 'rate-excellent';
    if (rate >= 75) return 'rate-good';
    if (rate >= 65) return 'rate-warning';
    return 'rate-poor';
}

function getKpi7Class(rate) {
    if (rate >= 95) return 'rate-excellent';
    if (rate >= 85) return 'rate-good';
    if (rate >= 75) return 'rate-warning';
    return 'rate-poor';
}

function getMonthData(year, month) {
    return fullData.filter(d => {
        const date = parseDate(d.date);
        return date.getFullYear() === year && date.getMonth() === month && n(d.orders) > 0;
    });
}

function getYearData(year) {
    return fullData.filter(d => {
        const date = parseDate(d.date);
        return date.getFullYear() === year;
    });
}

function showLoading(show) {
    isLoading = show;
    const kpis = ['fillRate4Day', 'fillRate7Day', 'totalOrders', 'avgOrders'];
    if (show) {
        kpis.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '...';
        });
        const tbody = document.getElementById('dataTable');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading data...</td></tr>';
    }
}

function updateDashboard() {
    if (isLoading) return;

    if (currentView === 'calendar') {
        renderCalendarView();
        const yearData = getYearData(currentYear);
        const validData = yearData.filter(d => n(d.orders) > 0);

        if (validData.length === 0) {
            document.getElementById('fillRate4Day').textContent = 'N/A';
            document.getElementById('fillRate7Day').textContent = 'N/A';
            document.getElementById('totalOrders').textContent = '0';
            document.getElementById('avgOrders').textContent = '0';
            return;
        }

        const avg4Day = validData.reduce((sum, d) => sum + n(d.rate4), 0) / validData.length;
        const avg7Day = validData.reduce((sum, d) => sum + n(d.rate7), 0) / validData.length;
        const totalOrders = validData.reduce((sum, d) => sum + n(d.orders), 0);

        const el4y = document.getElementById('fillRate4Day');
        const el7y = document.getElementById('fillRate7Day');
        el4y.textContent = avg4Day.toFixed(0) + '%';
        el7y.textContent = avg7Day.toFixed(0) + '%';
        el4y.className = 'kpi-value ' + getKpi4Class(avg4Day);
        el7y.className = 'kpi-value ' + getKpi7Class(avg7Day);
        document.getElementById('totalOrders').textContent = totalOrders.toLocaleString();
        document.getElementById('avgOrders').textContent = Math.round(totalOrders / validData.length).toLocaleString();
        document.getElementById('periodLabel').textContent = 'year';
    } else {
        const monthData = getMonthData(currentYear, currentMonth);

        if (monthData.length === 0) {
            document.getElementById('fillRate4Day').textContent = 'N/A';
            document.getElementById('fillRate7Day').textContent = 'N/A';
            document.getElementById('totalOrders').textContent = '0';
            document.getElementById('avgOrders').textContent = '0';

            if (fillRateChart) fillRateChart.destroy();
            if (ordersChart) ordersChart.destroy();

            document.getElementById('dataTable').innerHTML = '<tr><td colspan="6" style="text-align: center;">No data available for this month</td></tr>';
            document.getElementById('periodLabel').textContent = 'month';
            return;
        }

        const avg4Day = monthData.reduce((sum, d) => sum + n(d.rate4), 0) / monthData.length;
        const avg7Day = monthData.reduce((sum, d) => sum + n(d.rate7), 0) / monthData.length;
        const totalOrders = monthData.reduce((sum, d) => sum + n(d.orders), 0);

        const el4 = document.getElementById('fillRate4Day');
        const el7 = document.getElementById('fillRate7Day');
        el4.textContent = avg4Day.toFixed(0) + '%';
        el7.textContent = avg7Day.toFixed(0) + '%';
        el4.className = 'kpi-value ' + getKpi4Class(avg4Day);
        el7.className = 'kpi-value ' + getKpi7Class(avg7Day);
        document.getElementById('totalOrders').textContent = totalOrders.toLocaleString();
        document.getElementById('avgOrders').textContent = Math.round(totalOrders / monthData.length).toLocaleString();
        document.getElementById('periodLabel').textContent = 'month';

        updateCharts(monthData);
        updateTable(monthData);
    }
}

/**
 * Load data from the API and refresh the dashboard.
 * For monthly view: fetches just that month.
 * For calendar view: fetches the full year.
 */
async function loadAndRefresh() {
    showLoading(true);

    try {
        if (currentView === 'calendar') {
            await loadKPIYear(currentYear, currentDataset);
        } else {
            await loadKPIData(currentYear, currentMonth, currentDataset);
        }
    } catch (e) {
        console.error('Failed to load KPI data:', e);
    }

    showLoading(false);
    updateDashboard();
}

function forceHideTooltip() {
  const tooltip = document.getElementById('tooltip');
  if (!tooltip) return;
  tooltip.classList.remove('show');
}

function renderCalendarView() {
    forceHideTooltip();
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

    for (let m = 0; m < 12; m++) {
        const monthDiv = document.createElement('div');
        monthDiv.className = 'month-calendar';

        const header = document.createElement('div');
        header.className = 'month-header';
        header.textContent = months[m];
        monthDiv.appendChild(header);

        const daysContainer = document.createElement('div');
        daysContainer.className = 'calendar-days';

        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
            const label = document.createElement('div');
            label.className = 'day-label';
            label.textContent = day;
            daysContainer.appendChild(label);
        });

        const firstDay = new Date(currentYear, m, 1).getDay();
        const daysInMonth = new Date(currentYear, m + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            daysContainer.appendChild(empty);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dayData = fullData.find(item => {
                const date = parseDate(item.date);
                return date.getFullYear() === currentYear &&
                       date.getMonth() === m &&
                       date.getDate() === d;
            });

            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';

            if (dayData && n(dayData.orders) > 0) {
                const rate = n(dayData.rate7);
                let rateClass = 'cal-rate-none';

                if (rate >= 95) rateClass = 'cal-rate-excellent';
                else if (rate >= 85) rateClass = 'cal-rate-good';
                else if (rate >= 70) rateClass = 'cal-rate-warning';
                else if (rate > 0) rateClass = 'cal-rate-poor';

                dayDiv.classList.add(rateClass);
                dayDiv.innerHTML = `<strong>${d}</strong><br>${rate.toFixed(0)}%`;

                dayDiv.addEventListener('mouseenter', (e) => showTooltip(e, dayData));
                dayDiv.addEventListener('mouseleave', hideTooltip);
                dayDiv.addEventListener('mousemove', moveTooltip);
            } else {
                dayDiv.classList.add('cal-rate-none');
                dayDiv.innerHTML = `${d}`;
            }

            daysContainer.appendChild(dayDiv);
        }

        monthDiv.appendChild(daysContainer);
        grid.appendChild(monthDiv);
    }
}

function showTooltip(e, data) {
    const tooltip = document.getElementById('tooltip');
    const date = parseDate(data.date);

   tooltip.innerHTML = `
<strong>${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong><br>
Orders: ${n(data.orders).toLocaleString()}<br>
4-Day Rate: ${n(data.rate4).toFixed(2)}%<br>
7-Day Rate: ${n(data.rate7).toFixed(2)}%<br>
Remaining (4d): ${n(data.rem4).toLocaleString()}<br>
Remaining (7d): ${n(data.rem7).toLocaleString()}
`.trim();

    tooltip.classList.add('show');
    moveTooltip(e);
}

function hideTooltip() {
    document.getElementById('tooltip').classList.remove('show');
}

function moveTooltip(e) {
    const tooltip = document.getElementById('tooltip');
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 15;

    let left = e.clientX + padding;
    let top = e.clientY + padding;

    if (left + tooltipRect.width > window.innerWidth) left = e.clientX - tooltipRect.width - padding;
    if (top + tooltipRect.height > window.innerHeight) top = e.clientY - tooltipRect.height - padding;
    if (left < 0) left = padding;
    if (top < 0) top = padding;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

function updateCharts(monthData) {
    const labels = monthData.map(d => parseDate(d.date).getDate());

    if (fillRateChart) fillRateChart.destroy();

    const ctx1 = document.getElementById('fillRateChart').getContext('2d');

    fillRateChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '7 Day Fill Rate (Target: 95%)',
                    data: monthData.map(d => n(d.rate7)),
                    borderColor: '#8b7355',
                    backgroundColor: 'rgba(139, 115, 85, 0.1)',
                    tension: 0.3, fill: true, borderWidth: 3,
                    pointRadius: 4, pointHoverRadius: 8,
                    pointBackgroundColor: '#8b7355', pointBorderColor: '#fff', pointBorderWidth: 2, order: 1
                },
                {
                    label: '4 Day Fill Rate (Target: 85%)',
                    data: monthData.map(d => n(d.rate4)),
                    borderColor: '#d2b48c',
                    backgroundColor: 'rgba(210, 180, 140, 0.1)',
                    tension: 0.3, fill: true, borderWidth: 3,
                    pointRadius: 4, pointHoverRadius: 8,
                    pointBackgroundColor: '#d2b48c', pointBorderColor: '#fff', pointBorderWidth: 2, order: 2
                },
                {
                    label: '95% Target Line',
                    data: Array(labels.length).fill(95),
                    borderColor: '#5a8c5a', borderWidth: 2, borderDash: [8, 4],
                    pointRadius: 0, pointHoverRadius: 0, fill: false, order: 3
                },
                {
                    label: '85% Target Line',
                    data: Array(labels.length).fill(85),
                    borderColor: '#d4a05c', borderWidth: 2, borderDash: [8, 4],
                    pointRadius: 0, pointHoverRadius: 0, fill: false, order: 4
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, labels: { color: '#8b7355', font: { size: 11 }, usePointStyle: true, padding: 12, boxWidth: 15 } },
                tooltip: { callbacks: { label: function(context) {
                    let label = context.dataset.label || '';
                    if (label && !label.includes('Target Line')) label += ': ' + context.parsed.y.toFixed(1) + '%';
                    return label;
                } } }
            },
            scales: {
                y: { min: 0, max: 105, ticks: { callback: v => v + '%', color: '#a0906f', stepSize: 10 }, grid: { color: 'rgba(210, 180, 140, 0.1)' } },
                x: { ticks: { color: '#a0906f' }, grid: { color: 'rgba(210, 180, 140, 0.1)' } }
            }
        }
    });

    if (ordersChart) ordersChart.destroy();

    const ctx2 = document.getElementById('ordersChart').getContext('2d');
    ordersChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Orders Remaining (4 Day)',
                data: monthData.map(d => n(d.rem4)),
                borderColor: '#d2b48c', backgroundColor: 'rgba(210, 180, 140, 0.1)',
                tension: 0.3, fill: true, borderWidth: 3,
                pointRadius: 4, pointHoverRadius: 8,
                pointBackgroundColor: '#d2b48c', pointBorderColor: '#fff', pointBorderWidth: 2
            }, {
                label: 'Orders Remaining (7 Day)',
                data: monthData.map(d => n(d.rem7)),
                borderColor: '#8b7355', backgroundColor: 'rgba(139, 115, 85, 0.1)',
                tension: 0.3, fill: true, borderWidth: 3,
                pointRadius: 4, pointHoverRadius: 8,
                pointBackgroundColor: '#8b7355', pointBorderColor: '#fff', pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, labels: { color: '#8b7355', font: { size: 11 }, usePointStyle: true, padding: 12, boxWidth: 15 } },
                tooltip: { callbacks: { label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) label += ': ' + context.parsed.y.toLocaleString();
                    return label;
                } } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: '#a0906f', callback: v => v.toLocaleString() }, grid: { color: 'rgba(210, 180, 140, 0.1)' } },
                x: { ticks: { color: '#a0906f' }, grid: { color: 'rgba(210, 180, 140, 0.1)' } }
            }
        }
    });
}

const yearSelect = document.getElementById('yearSelect');
const monthSelect = document.getElementById('monthSelect');

function populateYearMonthSelectors() {
    yearSelect.innerHTML = '';
    const years = [2024, 2025, 2026];

    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    monthSelect.innerHTML = '';
    const months = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December'
    ];

    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    yearSelect.value = currentYear;
    monthSelect.value = currentMonth;
}

function updateTable(monthData) {
    const tbody = document.getElementById('dataTable');
    tbody.innerHTML = '';

    monthData.forEach(row => {
        const tr = document.createElement('tr');
        const date = parseDate(row.date);

        tr.innerHTML = `
            <td>${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
            <td>${n(row.orders).toLocaleString()}</td>
            <td class="${getKpi4Class(n(row.rate4))}">${n(row.rem4).toLocaleString()}</td>
            <td class="${getKpi7Class(n(row.rate7))}">${n(row.rem7).toLocaleString()}</td>
            <td class="${getKpi4Class(n(row.rate4))}">${n(row.rate4).toFixed(2)}%</td>
            <td class="${getKpi7Class(n(row.rate7))}">${n(row.rate7).toFixed(2)}%</td>
        `;

        tbody.appendChild(tr);
    });
}

// --- View toggle buttons ---
document.getElementById('monthlyBtn').addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('monthlyBtn').classList.add('active');
    currentView = 'monthly';

    document.getElementById('monthlyView').style.display = 'grid';
    document.getElementById('calendarView').style.display = 'none';
    document.getElementById('monthSelect').disabled = false;

    loadAndRefresh();
});

document.getElementById('calendarBtn').addEventListener('click', () => {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('calendarBtn').classList.add('active');
    currentView = 'calendar';

    document.getElementById('monthlyView').style.display = 'none';
    document.getElementById('calendarView').style.display = 'block';
    document.getElementById('monthSelect').disabled = true;

    loadAndRefresh();
});

// --- Year/Month selectors ---
document.getElementById('yearSelect').addEventListener('change', e => {
    currentYear = parseInt(e.target.value);
    loadAndRefresh();
});

document.getElementById('monthSelect').addEventListener('change', e => {
    currentMonth = parseInt(e.target.value);
    loadAndRefresh();
});

// --- Dataset selector (retail / wholesale / total) ---
const datasetSelect = document.getElementById('datasetSelect');
const datasetLabel = document.getElementById('datasetLabel');

const syncLabel = (val) => {
    if (!datasetLabel) return;
    if (val === 'wholesale') datasetLabel.textContent = '- Wholesale';
    else if (val === 'total') datasetLabel.textContent = '- Retail + Wholesale';
    else datasetLabel.textContent = '- Retail';
};

if (datasetSelect) {
    datasetSelect.addEventListener('change', () => {
        currentDataset = datasetSelect.value;
        syncLabel(currentDataset);
        loadAndRefresh();
    });
}

// --- TV Mode support ---
window.addEventListener('message', (event) => {
  if (event.data?.type === 'TV_VIEW_STATE') {
    document.body.classList.toggle('tv-view-active', event.data.active);
  }
});

window.addEventListener('message', (event) => {
  const msg = event.data;
  const isTvAction = msg?.type === 'TV_ACTION';
  const isTvCommand = msg?.type === 'TV_COMMAND';
  if (!isTvAction && !isTvCommand) return;

  const payload = isTvAction ? msg : (msg.payload || {});
  if (payload.target && payload.target !== 'fulfillment') return;

  if (payload.dataset) {
    const ds = String(payload.dataset).toLowerCase();
    if (datasetSelect && ['retail','wholesale','total'].includes(ds)) {
      datasetSelect.value = ds;
      datasetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  if (payload.view) {
    const monthlyBtn = document.getElementById('monthlyBtn');
    const calendarBtn = document.getElementById('calendarBtn');
    if (payload.view === 'monthly' && monthlyBtn && !monthlyBtn.classList.contains('active')) monthlyBtn.click();
    if (payload.view === 'calendar' && calendarBtn && !calendarBtn.classList.contains('active')) calendarBtn.click();
  }
});

// --- Initialize ---
populateYearMonthSelectors();
syncLabel('retail');
loadAndRefresh();

// --- Auto-refresh every 10 minutes ---
setInterval(() => {
    if (!isLoading) loadAndRefresh();
}, 10 * 60 * 1000);

});
