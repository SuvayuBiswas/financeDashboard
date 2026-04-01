const CATS = ['Food','Transport','Shopping','Utilities','Entertainment','Healthcare','Salary','Freelance','Other'];
const CAT_COLORS = {
  Food: '#f0b460', Transport: '#5b8df0', Shopping: '#c8f060',
  Utilities: '#a06cf0', Entertainment: '#f06090', Healthcare: '#60c8a0',
  Salary: '#60d4f0', Freelance: '#f09060', Other: '#8090a0'
};
const EMOJIS = {
  Food:'🍕', Transport:'🚌', Shopping:'🛍️', Utilities:'💡',
  Entertainment:'🎬', Healthcare:'💊', Salary:'💼', Freelance:'💻', Other:'📦'
};

const SEED_TRANSACTIONS = [
  {id:1,  merchant:'Swiggy',          category:'Food',          type:'expense', amount:480,   date:'2026-04-01'},
  {id:2,  merchant:'Salary — Infosys',category:'Salary',        type:'income',  amount:85000, date:'2026-04-01'},
  {id:3,  merchant:'Ola Cabs',        category:'Transport',     type:'expense', amount:320,   date:'2026-03-30'},
  {id:4,  merchant:'Amazon',          category:'Shopping',      type:'expense', amount:2200,  date:'2026-03-28'},
  {id:5,  merchant:'BSNL Bill',       category:'Utilities',     type:'expense', amount:799,   date:'2026-03-27'},
  {id:6,  merchant:'Netflix',         category:'Entertainment', type:'expense', amount:649,   date:'2026-03-26'},
  {id:7,  merchant:'Apollo Pharmacy', category:'Healthcare',    type:'expense', amount:1150,  date:'2026-03-24'},
  {id:8,  merchant:'Zomato',          category:'Food',          type:'expense', amount:360,   date:'2026-03-23'},
  {id:9,  merchant:'Freelance — Web', category:'Freelance',     type:'income',  amount:12000, date:'2026-03-22'},
  {id:10, merchant:'BigBasket',       category:'Food',          type:'expense', amount:1860,  date:'2026-03-20'},
  {id:11, merchant:'IRCTC',           category:'Transport',     type:'expense', amount:2450,  date:'2026-03-18'},
  {id:12, merchant:'Myntra',          category:'Shopping',      type:'expense', amount:3400,  date:'2026-03-15'},
  {id:13, merchant:'Byju\'s',         category:'Entertainment', type:'expense', amount:1200,  date:'2026-03-14'},
  {id:14, merchant:'Salary — Infosys',category:'Salary',        type:'income',  amount:85000, date:'2026-03-01'},
  {id:15, merchant:'IKEA',            category:'Shopping',      type:'expense', amount:5800,  date:'2026-02-28'},
  {id:16, merchant:'Uber',            category:'Transport',     type:'expense', amount:600,   date:'2026-02-25'},
  {id:17, merchant:'Electricity Bill',category:'Utilities',     type:'expense', amount:1200,  date:'2026-02-22'},
  {id:18, merchant:'Freelance — App', category:'Freelance',     type:'income',  amount:18000, date:'2026-02-20'},
  {id:19, merchant:'Domino\'s',       category:'Food',          type:'expense', amount:520,   date:'2026-02-18'},
  {id:20, merchant:'Salary — Infosys',category:'Salary',        type:'income',  amount:85000, date:'2026-02-01'},
  {id:21, merchant:'Gym Membership',  category:'Healthcare',    type:'expense', amount:2000,  date:'2026-01-28'},
  {id:22, merchant:'Spotify',         category:'Entertainment', type:'expense', amount:119,   date:'2026-01-26'},
  {id:23, merchant:'Salary — Infosys',category:'Salary',        type:'income',  amount:85000, date:'2026-01-01'},
  {id:24, merchant:'D-Mart',          category:'Food',          type:'expense', amount:3200,  date:'2026-01-15'},
  {id:25, merchant:'Airtel Recharge', category:'Utilities',     type:'expense', amount:399,   date:'2026-01-10'},
];

/*STATE */
let state = {
  transactions: JSON.parse(localStorage.getItem('ledger_tx') || 'null') || SEED_TRANSACTIONS,
  role: localStorage.getItem('ledger_role') || 'admin',
  filters: { search: '', type: '', category: '' },
  sort: { col: 'date', dir: 'desc' },
  currentPage: 1,
  editId: null,
};
const PER_PAGE = 8;

function saveState() {
  localStorage.setItem('ledger_tx', JSON.stringify(state.transactions));
  localStorage.setItem('ledger_role', state.role);
}

/*HELPERS*/
function fmt(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', {maximumFractionDigits:2});
}
function fmtDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
}
let nextId = () => Math.max(...state.transactions.map(t=>t.id), 0) + 1;

/*DERIVED*/
function totals() {
  let income = 0, expense = 0;
  state.transactions.forEach(t => {
    if (t.type === 'income')  income  += t.amount;
    else                      expense += t.amount;
  });
  return { income, expense, balance: income - expense };
}

function byCategory() {
  const map = {};
  state.transactions.filter(t => t.type === 'expense').forEach(t => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });
  return Object.entries(map).sort((a,b) => b[1]-a[1]);
}

function monthlyData() {
  const months = {};
  state.transactions.forEach(t => {
    const m = t.date.slice(0,7);
    if (!months[m]) months[m] = { income:0, expense:0 };
    months[m][t.type] += t.amount;
  });
  return months;
}

function balanceTrend() {
  // monthly running balance (sorted oldest first)
  const md = monthlyData();
  const keys = Object.keys(md).sort();
  let running = 0;
  return keys.map(k => {
    running += md[k].income - md[k].expense;
    return { month: k, balance: running };
  });
}

/*CHARTS*/
let lineChart, donutChart, barChart;

Chart.defaults.color = '#9b9b93';
Chart.defaults.borderColor = '#e8e8e4';
Chart.defaults.font.family = "'DM Mono', monospace";
Chart.defaults.font.size = 10;

function buildLineChart() {
  const ctx = document.getElementById('lineChart').getContext('2d');
  const trend = balanceTrend();
  const labels = trend.map(t => {
    const [y,m] = t.month.split('-');
    return new Date(y,m-1).toLocaleString('en-IN',{month:'short',year:'2-digit'});
  });
  const data = trend.map(t => t.balance);

  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Balance',
        data,
        borderColor: '#1a1a18',
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0,0,0,200);
          g.addColorStop(0,'rgba(26,26,24,.07)');
          g.addColorStop(1,'rgba(26,26,24,0)');
          return g;
        },
        fill: true,
        tension: .4,
        pointBackgroundColor: '#1a1a18',
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 1.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => ' ' + fmt(ctx.raw)
      }}},
      scales: {
        y: { ticks: { callback: v => '₹' + (v/1000).toFixed(0)+'k' }, grid: { color:'#f0f0ee' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function buildDonutChart() {
  const ctx = document.getElementById('donutChart').getContext('2d');
  const cats = byCategory();
  const labels = cats.map(c => c[0]);
  const data   = cats.map(c => c[1]);
  const colors = labels.map(l => CAT_COLORS[l] || '#8090a0');
  const total  = data.reduce((a,b)=>a+b, 0);

  document.getElementById('donutTotal').textContent = fmt(total);

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#ffffff', hoverOffset: 4 }] },
    options: {
      cutout: '68%',
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` } }
      }
    }
  });

  // Legend
  const lg = document.getElementById('donutLegend');
  lg.innerHTML = cats.map(([cat, val]) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${CAT_COLORS[cat]||'#8090a0'}"></div>
      <span class="legend-name">${cat}</span>
      <span class="legend-val">${fmt(val)}</span>
      <span class="legend-pct">${total ? Math.round(val/total*100)+'%' : ''}</span>
    </div>`).join('');
}

function buildBarChart() {
  const ctx = document.getElementById('barChart').getContext('2d');
  const md = monthlyData();
  const keys = Object.keys(md).sort().slice(-6);
  const labels = keys.map(k => {
    const [y,m] = k.split('-');
    return new Date(y,m-1).toLocaleString('en-IN',{month:'short'});
  });
  const incomes   = keys.map(k => md[k].income);
  const expenses  = keys.map(k => md[k].expense);

  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income',  data: incomes,  backgroundColor: 'rgba(22,101,52,.75)',  borderRadius: 3 },
        { label: 'Expenses',data: expenses, backgroundColor: 'rgba(153,27,27,.65)',  borderRadius: 3 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { boxWidth: 8, padding: 16, font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` } }
      },
      scales: {
        y: { ticks: { callback: v => '₹'+(v/1000).toFixed(0)+'k' }, grid: { color:'#f0f0ee' } },
        x: { grid: { display: false } }
      }
    }
  });
}

/*RENDER*/
function renderSummaryCards() {
  const t = totals();
  const lastMonthKey = Object.keys(monthlyData()).sort().slice(-2,-1)[0];
  const lm = lastMonthKey ? monthlyData()[lastMonthKey] : {income:0,expense:0};

  const cards = [
    { label:'Total Balance', value: fmt(t.balance), cls:'green',  delta: null },
    { label:'Total Income',  value: fmt(t.income),  cls:'blue',   delta: `+${fmt(lm.income)} last mo` },
    { label:'Total Expenses',value: fmt(t.expense), cls:'red',    delta: `${fmt(lm.expense)} last mo` },
    { label:'Transactions',  value: state.transactions.length,    cls:'gold', delta: null },
  ];
  document.getElementById('summaryCards').innerHTML = cards.map(c => `
    <div class="card ${c.cls}">
      <div class="card-label">${c.label}</div>
      <div class="card-value ${c.cls}">${c.value}</div>
      ${c.delta ? `<div class="card-delta">${c.delta}</div>` : ''}
    </div>`).join('');
}

function renderRecentTx() {
  const recent = [...state.transactions]
    .sort((a,b) => new Date(b.date)-new Date(a.date))
    .slice(0,5);
  const tbody = document.getElementById('recentTxBody');
  if (!recent.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No transactions yet.</div></td></tr>'; return; }
  tbody.innerHTML = recent.map(t => txRow(t, false)).join('');
}

function txRow(t, showActions) {
  const isAdmin = state.role === 'admin';
  return `<tr data-id="${t.id}">
    <td><div style="display:flex;align-items:center;gap:10px">
      <div class="tx-icon" style="background:${CAT_COLORS[t.category]}22">${EMOJIS[t.category]||'📦'}</div>
      <div><div class="tx-name">${escHtml(t.merchant)}</div></div>
    </div></td>
    <td><span class="tx-cat">${t.category}</span></td>
    <td style="white-space:nowrap;color:var(--muted);font-family:var(--font-mono);font-size:11px">${fmtDate(t.date)}</td>
    <td><span class="badge badge-${t.type}">${t.type}</span></td>
    <td><span class="amount ${t.type}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</span></td>
    ${showActions && isAdmin ? `<td><div class="action-btns">
      <button class="btn btn-outline btn-sm" onclick="editTx(${t.id})">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteTx(${t.id})">Del</button>
    </div></td>` : (showActions ? '<td>—</td>' : '')}
  </tr>`;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getFiltered() {
  let txs = [...state.transactions];
  const {search, type, category} = state.filters;
  if (search)   txs = txs.filter(t => t.merchant.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()));
  if (type)     txs = txs.filter(t => t.type === type);
  if (category) txs = txs.filter(t => t.category === category);

  const {col, dir} = state.sort;
  txs.sort((a,b) => {
    let av = a[col], bv = b[col];
    if (col === 'date') { av = new Date(av); bv = new Date(bv); }
    if (col === 'amount') { av = +av; bv = +bv; }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
  return txs;
}

function renderTxTable() {
  const filtered = getFiltered();
  const total = filtered.length;
  const pages = Math.ceil(total / PER_PAGE) || 1;
  if (state.currentPage > pages) state.currentPage = 1;

  const slice = filtered.slice((state.currentPage-1)*PER_PAGE, state.currentPage*PER_PAGE);
  const tbody = document.getElementById('txBody');
  if (!slice.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No transactions match your filters.</div></td></tr>';
  } else {
    tbody.innerHTML = slice.map(t => txRow(t, true)).join('');
  }

  // Pagination
  const pg = document.getElementById('pagination');
  const start = (state.currentPage-1)*PER_PAGE+1;
  const end   = Math.min(state.currentPage*PER_PAGE, total);
  let btnHtml = `<span>${total === 0 ? 'No results' : `${start}–${end} of ${total}`}</span><div class="page-btns">`;
  btnHtml += `<button class="page-btn" onclick="goPage(${state.currentPage-1})" ${state.currentPage<=1?'disabled':''}>‹</button>`;
  for (let i=1; i<=pages; i++) {
    if (pages<=7 || Math.abs(i-state.currentPage)<=1 || i===1 || i===pages) {
      btnHtml += `<button class="page-btn ${i===state.currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
    } else if (Math.abs(i-state.currentPage)===2) {
      btnHtml += `<span style="color:var(--muted);line-height:28px">…</span>`;
    }
  }
  btnHtml += `<button class="page-btn" onclick="goPage(${state.currentPage+1})" ${state.currentPage>=pages?'disabled':''}>›</button></div>`;
  pg.innerHTML = btnHtml;

  // Category filter options
  const catSel = document.getElementById('filterCat');
  const usedCats = [...new Set(state.transactions.map(t=>t.category))].sort();
  const cur = catSel.value;
  catSel.innerHTML = '<option value="">All Categories</option>' +
    usedCats.map(c => `<option value="${c}" ${c===cur?'selected':''}>${c}</option>`).join('');
}

function renderInsights() {
  const t = totals();
  const cats = byCategory();
  const top = cats[0];
  const md = monthlyData();
  const months = Object.keys(md).sort();
  const lastTwo = months.slice(-2);
  const prev = lastTwo[0] ? md[lastTwo[0]] : {income:0,expense:0};
  const curr = lastTwo[1] ? md[lastTwo[1]] : {income:0,expense:0};
  const savings = t.income - t.expense;
  const savingsRate = t.income > 0 ? (savings/t.income*100).toFixed(1) : 0;

  const insights = [
    {
      icon:'🏆', bg:'rgba(200,240,96,.08)',
      title:'Highest Spending Category',
      value: top ? top[0] : '—',
      desc: top ? `You spent ${fmt(top[1])} on ${top[0]} in total — ${cats.length > 1 ? `more than any other category.` : 'your only expense category.'}` : 'No expense data yet.',
    },
    {
      icon:'📈', bg:'rgba(91,141,240,.08)',
      title:'Savings Rate',
      value: savingsRate + '%',
      desc: `You saved ${fmt(savings)} out of ${fmt(t.income)} total income. ${+savingsRate >= 20 ? 'Great job! You\'re above the 20% savings benchmark.' : 'Try to aim for at least 20% savings.'}`,
    },
    {
      icon:'🔄', bg:'rgba(240,180,96,.08)',
      title:'Month-over-Month Expenses',
      value: curr.expense > prev.expense ? '▲ Increased' : '▼ Decreased',
      desc: `Expenses went from ${fmt(prev.expense)} to ${fmt(curr.expense)} this month. ${curr.expense > prev.expense ? 'Watch your discretionary spending.' : 'You\'re trending well.'}`,
    },
    {
      icon:'💰', bg:'rgba(96,200,160,.08)',
      title:'Average Monthly Spend',
      value: fmt(t.expense / Math.max(months.length,1)),
      desc: `Across ${months.length} month${months.length!==1?'s':''} of data, your average monthly expenditure is ${fmt(t.expense / Math.max(months.length,1))}.`,
    },
  ];

  document.getElementById('insightsGrid').innerHTML = insights.map(ins => `
    <div class="insight-card">
      <div class="insight-icon" style="background:${ins.bg}">${ins.icon}</div>
      <div class="insight-title">${ins.title}</div>
      <div class="insight-value">${ins.value}</div>
      <div class="insight-desc">${ins.desc}</div>
    </div>`).join('');

  // Category bars
  const totalExp = cats.reduce((s,[,v])=>s+v, 0);
  document.getElementById('catBars').innerHTML = cats.map(([cat, val]) => `
    <div class="mc-row" style="margin-bottom:10px">
      <div class="mc-label">
        <span>${EMOJIS[cat]||''} ${cat}</span>
        <span>${fmt(val)} &nbsp;(${totalExp?Math.round(val/totalExp*100):0}%)</span>
      </div>
      <div class="mc-bar-bg">
        <div class="mc-bar" style="width:${totalExp?val/totalExp*100:0}%;background:${CAT_COLORS[cat]||'#8090a0'}"></div>
      </div>
    </div>`).join('');
}

/*NAVIGATION*/
const PAGE_META = {
  overview:     { title: 'Overview',      sub: 'Financial summary · April 2026' },
  transactions: { title: 'Transactions',  sub: 'All records, filter & manage' },
  insights:     { title: 'Insights',      sub: 'Spending patterns & analysis' },
};

function navigate(btn) {
  const id = typeof btn === 'string' ? btn : btn.dataset.page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === id);
  });
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === 'page-'+id);
  });
  const meta = PAGE_META[id] || { title: id, sub: '' };
  document.getElementById('topbarTitle').textContent = meta.title;
  document.getElementById('topbarSub').textContent   = meta.sub;

  // Lazy-build charts when their page becomes visible
  if (id === 'overview') {
    setTimeout(() => { buildLineChart(); buildDonutChart(); }, 50);
  }
  if (id === 'transactions') renderTxTable();
  if (id === 'insights') {
    renderInsights();
    setTimeout(buildBarChart, 50);
  }
  // Close sidebar on mobile
  if (window.innerWidth < 720) document.getElementById('sidebar').classList.remove('open');
}

/*FILTERS & SORT*/
function filterTx() {
  state.filters.search   = document.getElementById('txSearch').value;
  state.filters.type     = document.getElementById('filterType').value;
  state.filters.category = document.getElementById('filterCat').value;
  const sortVal = document.getElementById('sortBy').value;
  const [col, dir] = sortVal.split('-');
  state.sort = { col, dir };
  state.currentPage = 1;
  renderTxTable();
}

function setSortCol(col) {
  if (state.sort.col === col) {
    state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort = { col, dir: 'desc' };
  }
  renderTxTable();
}

function goPage(n) {
  const total = getFiltered().length;
  const pages = Math.ceil(total/PER_PAGE)||1;
  if (n < 1 || n > pages) return;
  state.currentPage = n;
  renderTxTable();
}

/*MODAL / CRUD*/
function openModal(id) {
  state.editId = id || null;
  document.getElementById('modalTitle').textContent = id ? 'Edit Transaction' : 'Add Transaction';
  document.getElementById('saveBtn').textContent = id ? 'Update' : 'Save';

  if (id) {
    const tx = state.transactions.find(t => t.id === id);
    if (!tx) return;
    document.getElementById('fMerchant').value = tx.merchant;
    document.getElementById('fAmount').value   = tx.amount;
    document.getElementById('fCat').value      = tx.category;
    document.getElementById('fType').value     = tx.type;
    document.getElementById('fDate').value     = tx.date;
  } else {
    document.getElementById('fMerchant').value = '';
    document.getElementById('fAmount').value   = '';
    document.getElementById('fCat').value      = 'Food';
    document.getElementById('fType').value     = 'expense';
    document.getElementById('fDate').value     = new Date().toISOString().slice(0,10);
  }
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  state.editId = null;
}
function closeModalIfOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function saveTransaction() {
  const merchant = document.getElementById('fMerchant').value.trim();
  const amount   = parseFloat(document.getElementById('fAmount').value);
  const category = document.getElementById('fCat').value;
  const type     = document.getElementById('fType').value;
  const date     = document.getElementById('fDate').value;

  if (!merchant || isNaN(amount) || amount <= 0 || !date) {
    toast('Please fill all fields correctly.', 'error'); return;
  }

  if (state.editId) {
    const idx = state.transactions.findIndex(t => t.id === state.editId);
    if (idx !== -1) state.transactions[idx] = { id: state.editId, merchant, amount, category, type, date };
    toast('Transaction updated.', 'success');
  } else {
    state.transactions.push({ id: nextId(), merchant, amount, category, type, date });
    toast('Transaction added.', 'success');
  }

  saveState();
  closeModal();
  refreshAll();
}

function editTx(id) {
  if (state.role !== 'admin') return;
  openModal(id);
}

function deleteTx(id) {
  if (state.role !== 'admin') return;
  if (!confirm('Delete this transaction?')) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
  renderTxTable();
  renderSummaryCards();
  toast('Transaction deleted.', 'info');
}

/*ROLE*/
function switchRole(role) {
  state.role = role;
  saveState();
  applyRole();
  renderTxTable();
  toast(`Switched to ${role} mode.`, 'info');
}

function applyRole() {
  const isAdmin = state.role === 'admin';
  document.getElementById('addTxBtn').style.display = isAdmin ? '' : 'none';
  document.getElementById('actionTh').style.display = isAdmin ? '' : 'none';
  document.getElementById('roleSelect').value = state.role;
  const badge = document.getElementById('roleBadge');
  badge.className = `role-badge ${state.role}`;
  document.getElementById('roleText').textContent = isAdmin ? 'Admin — Full Access' : 'Viewer — Read Only';
  const avatar = document.getElementById('avatarEl');
  avatar.textContent = isAdmin ? 'AD' : 'VW';
}

/*EXPORT*/
function exportCSV() {
  const filtered = getFiltered();
  const header = 'Merchant,Category,Type,Amount,Date\n';
  const rows = filtered.map(t =>
    `"${t.merchant}","${t.category}","${t.type}",${t.amount},"${t.date}"`
  ).join('\n');
  const blob = new Blob([header+rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ledger-transactions.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('Exported as CSV!', 'success');
}

/*TOAST*/
function toast(msg, type='info') {
  const icons = { success:'✓', error:'✕', info:'i' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]||''}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3000);
}

/*CLOCK*/
function updateClock() {
  const now = new Date();
  document.getElementById('timeBadge').textContent =
    now.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', hour12:true});
}
setInterval(updateClock, 1000);
updateClock();

/*MISC*/
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function refreshAll() {
  renderSummaryCards();
  renderRecentTx();
  buildLineChart();
  buildDonutChart();
}

/*INIT*/
window.addEventListener('DOMContentLoaded', () => {
  applyRole();
  renderSummaryCards();
  renderRecentTx();
  setTimeout(() => { buildLineChart(); buildDonutChart(); }, 80);
});