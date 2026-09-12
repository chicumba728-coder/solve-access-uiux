/**
 * Solve Acess — Page Renderers in Pure Vanilla JavaScript
 * Generates semantic HTML matching exactly the original Figma UI design
 * All data comes from real backend endpoints — no mocks or fake data.
 */

const Pages = (() => {

  // ─── Helper Functions ─────────────────────────────────────────────────────

  function formatMoney(value) {
    const num = Number(value ?? 0);
    return num.toLocaleString('pt-PT', { style: 'currency', currency: 'AOA' });
  }

  function formatDate(value, options = {}) {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date)) return '—';
    return date.toLocaleDateString('pt-PT', options.day === undefined ? { day: '2-digit', month: 'short', year: 'numeric' } : options);
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (isNaN(date)) return '—';
    return date.toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }

  function statusLabel(status) {
    const map = {
      ACTIVE: 'Ativo',
      INACTIVE: 'Inativo',
      DEACTIVATED: 'Desativado',
      CLOSED: 'Encerrado',
      FROZEN: 'Congelado',
      PAID: 'Pago',
      PENDING: 'Pendente',
      OVERDUE: 'Em atraso',
      RELEASED: 'Liberado',
      PRESENT: 'Presente',
      ABSENT: 'Ausente',
      EXCUSED: 'Justificado',
      AUTHORIZED: 'Autorizado',
      DENIED: 'Negado',
      UNKNOWN_CLIENT: 'Desconhecido',
      ENTRY: 'Entrada',
      EXIT: 'Saída',
      ADMS: 'ADMS',
      SDK: 'SDK',
      API: 'API',
      CASH: 'Numerário',
      CARD: 'Cartão',
      TRANSFER: 'Transferência',
      MOBILE_MONEY: 'Mobile Money',
      MULTICAIXA: 'Multicaixa',
      OTHER: 'Outro',
      CONFIRMED: 'Confirmado',
      VOIDED: 'Anulado',
      REFUNDED: 'Reembolsado',
    };
    return map[status] || status || '—';
  }

  function statusBadgeClass(status) {
    const map = {
      ACTIVE: 'badge-paid',
      PAID: 'badge-paid',
      PRESENT: 'badge-paid',
      AUTHORIZED: 'badge-paid',
      INACTIVE: 'badge-inactive',
      DEACTIVATED: 'badge-inactive',
      CLOSED: 'badge-inactive',
      PENDING: 'badge-pending',
      OVERDUE: 'badge-overdue',
      ABSENT: 'badge-overdue',
      DENIED: 'badge-overdue',
      UNKNOWN_CLIENT: 'badge-overdue',
      FROZEN: 'badge-pending',
      EXCUSED: 'badge-pending',
      RELEASED: 'badge-pending',
      CONFIRMED: 'badge-paid',
      VOIDED: 'badge-overdue',
      REFUNDED: 'badge-inactive',
    };
    return map[status] || 'badge-inactive';
  }

  function renderSectionHeader(title, description, actionsHtml = '') {
    return `
      <div class="section-header">
        <div>
          <h1 class="section-title">${title}</h1>
          ${description ? `<p class="section-desc">${description}</p>` : ''}
        </div>
        ${actionsHtml ? `<div class="section-actions">${actionsHtml}</div>` : ''}
      </div>
    `;
  }

  function renderEmptyState(iconName, title, description = '', actionHtml = '') {
    return `
      <div class="empty-state">
        <div class="empty-icon-circle">
          ${Icons.get(iconName, 22)}
        </div>
        <p class="empty-title">${title}</p>
        ${description ? `<p class="empty-desc">${description}</p>` : ''}
        ${actionHtml ? `<div class="empty-action">${actionHtml}</div>` : ''}
      </div>
    `;
  }

  function renderStatCard(label, iconName, value = null, iconColor = 'var(--primary)', iconBg = '#f0fdf4', trend = '', trendUp = true) {
    const valueHtml = value === null || value === undefined
      ? '<div class="skeleton" style="height: 24px; width: 64px; margin-top: 10px;"></div>'
      : `<p class="stat-card-value">${value}</p>`;
    return `
      <div class="stat-card">
        <div class="stat-card-top">
          <div>
            <p class="stat-card-label">${label}</p>
            ${valueHtml}
            ${trend ? `<p class="stat-card-trend ${trendUp ? 'up' : ''}">${trend}</p>` : ''}
          </div>
          <div class="stat-card-icon" style="background-color: ${iconBg}; color: ${iconColor};">
            ${Icons.get(iconName, 18)}
          </div>
        </div>
      </div>
    `;
  }

  function renderNoticeBox(title, description) {
    return `
      <div class="notice-box">
        <span class="notice-icon">${Icons.get('info', 16)}</span>
        <div>
          <p><strong>${title}</strong></p>
          <p style="margin-top: 2px;">${description}</p>
        </div>
      </div>
    `;
  }

  function renderChartPlaceholder(title, desc = 'Os dados aparecerão após o primeiro registo') {
    return `
      <div class="chart-placeholder">
        <div class="chart-placeholder-icon">
          ${Icons.get('bar-chart-2', 20)}
        </div>
        <p class="chart-placeholder-title">${title}</p>
        <p class="chart-placeholder-desc">${desc}</p>
      </div>
    `;
  }

  async function loadDashboardData(year, month) {
    try {
      return await API.dashboard(year || new Date().getUTCFullYear(), month);
    } catch {
      return null;
    }
  }

  function localCsv(rows, filename) {
    if (!rows || !rows.length) {
      UI.showToast('Sem dados para exportar.', 'error');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => headers.map((h) => String(row[h] ?? '').replace(/"/g, '""')).join(';'))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.showToast(`Exportado: ${filename}`, 'success');
  }

  // ─── Module-level state ──────────────────────────────────────────────────
  let _dashboardPeriod = 'month';
  let _reportsCategory = 'clientes';
  let _reportsDays = null;
  let _attendanceRange = 0;    // 0=hoje, 1=ontem, 7, 30, else custom
  let _attendanceFrom = '';
  let _attendanceTo = '';
  let _paymentsYear = new Date().getFullYear();
  let _paymentsMonth = new Date().getMonth() + 1;
  let _paymentsDay = '';

  function paymentsRange() {
    const year = _paymentsYear;
    const month = _paymentsMonth;
    const day = _paymentsDay;
    let from;
    let to;
    if (year && month && day) {
      from = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      to = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else if (year && month) {
      from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    } else if (year) {
      from = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      to = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    } else {
      return {};
    }
    return { from: from.toISOString(), to: to.toISOString() };
  }

  function paymentsMonthRange() {
    if (!_paymentsYear || !_paymentsMonth) return {};
    const from = new Date(Date.UTC(_paymentsYear, _paymentsMonth - 1, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(_paymentsYear, _paymentsMonth, 0, 23, 59, 59, 999));
    return { from: from.toISOString(), to: to.toISOString() };
  }

  function yearOptions(selected) {
    const now = new Date().getFullYear();
    const years = [];
    for (let y = now + 1; y >= now - 3; y--) years.push(y);
    return years.map(y => `<option value="${y}" ${y === selected ? 'selected' : ''}>${y}</option>`).join('');
  }

  function monthOptions(selected) {
    const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return names.map((n, i) => `<option value="${i + 1}" ${i + 1 === selected ? 'selected' : ''}>${n}</option>`).join('');
  }

  function dayOptions(selected, availableDays) {
    let out = '<option value="">Todos os dias</option>';
    const days = availableDays && availableDays.length ? availableDays : Array.from({ length: 31 }, (_, i) => i + 1);
    return out + days.map(d => `<option value="${d}" ${d === selected ? 'selected' : ''}>${d}</option>`).join('');
  }

  function paymentsFilterHtml(opts) {
    const { year, month, day, availableDays, count, total } = opts;
    return `
      <div class="card" style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px;">
        <div class="form-group" style="margin:0; min-width:110px;">
          <label class="form-label">Ano</label>
          <select id="payments-filter-year" class="form-select">${yearOptions(year)}</select>
        </div>
        <div class="form-group" style="margin:0; min-width:150px;">
          <label class="form-label">Mês</label>
          <select id="payments-filter-month" class="form-select">${monthOptions(month)}</select>
        </div>
        <div class="form-group" style="margin:0; min-width:130px;">
          <label class="form-label">Dia</label>
          <select id="payments-filter-day" class="form-select">${dayOptions(day, availableDays)}</select>
        </div>
        <div style="display:flex; gap:8px; margin-left:auto; align-items:center;">
          <span style="font-size:12px; color:var(--muted-foreground);">${count} pagamentos · ${formatMoney(total)}</span>
        </div>
      </div>
    `;
  }

  // ─── 1. Dashboard ─────────────────────────────────────────────────────────

  async function renderDashboard() {
    const year = new Date().getUTCFullYear();
    const month = _dashboardPeriod === 'month' ? new Date().getUTCMonth() + 1 : undefined;

const data = await loadDashboardData(year, month);
    let recentPayments = [];
    try { recentPayments = (await API.payments.list({ limit: 6 })) || []; } catch { /* toast */ }

    const countByStatus = (status) => {
      const found = data?.clients?.find(c => c.status === status);
      return found ? found._count._all : 0;
    };
    const financialByStatus = (status) => {
      return data?.financial?.find(f => f.financialStatus === status) || { _sum: { amountDue: 0, amountPaid: 0, amountOpen: 0 } };
    };
    const totalDue = (data?.financial || []).reduce((acc, f) => acc + Number(f._sum.amountDue || 0), 0);
    const pendingOpen = Number(financialByStatus('PENDING')._sum.amountOpen || 0);
    const overdueOpen = Number(financialByStatus('OVERDUE')._sum.amountOpen || 0);
    const receivedYear = Number(data?.receivedYear || 0);
    const receivedMonth = Number(data?.receivedMonth || 0);
    const totalPaid = Number(financialByStatus('PAID')._sum.amountPaid || 0);

    const periodBtns = [
      { id: 'month', label: 'Mês' },
      { id: 'week', label: 'Semana' },
      { id: 'year', label: 'Ano' },
    ];

    const quickActions = [
      { label: 'Novo cliente', icon: 'plus', href: '#/clientes/novo' },
      { label: 'Registar pagamento', icon: 'credit-card', action: 'openPaymentDrawer' },
      { label: 'Ver atrasos', icon: 'alert-triangle', href: '#/pendencias' },
      { label: 'Terminais', icon: 'monitor', href: '#/terminais' },
    ];

    const statusData = [
      { label: 'Pagos', color: '#16a34a', count: totalPaid, isMoney: true },
      { label: 'Pendentes', color: '#d97706', count: pendingOpen, isMoney: true },
      { label: 'Atraso', color: '#dc2626', count: overdueOpen, isMoney: true },
    ];

    const statusDist = [
      { label: 'Ativos', color: '#16a34a', value: countByStatus('ACTIVE') },
      { label: 'Inativos', color: '#94a3b8', value: countByStatus('INACTIVE') },
      { label: 'Desativados', color: '#64748b', value: countByStatus('DEACTIVATED') },
      { label: 'Congelados', color: '#0ea5e9', value: countByStatus('FROZEN') },
    ];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 24px;">
        ${renderSectionHeader(
          'Dashboard',
          'Visão geral do sistema',
          `
            <div id="dashboard-period-btns" style="display: flex; align-items: center; gap: 4px; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 2px; background: #ffffff;">
              ${periodBtns.map(b => `
                <button class="btn btn-sm ${b.id === _dashboardPeriod ? 'btn-primary' : 'btn-ghost'}" data-period="${b.id}" style="padding: 4px 10px;">${b.label}</button>
              `).join('')}
            </div>
          `
        )}

        <div class="stats-grid-6">
          ${renderStatCard('Clientes Ativos', 'users', countByStatus('ACTIVE'), '#16a34a', '#f0fdf4')}
          ${renderStatCard('Pagos', 'check-circle', formatMoney(totalPaid), '#16a34a', '#f0fdf4')}
          ${renderStatCard('Pendentes', 'clock', formatMoney(pendingOpen), '#d97706', '#fffbeb')}
          ${renderStatCard('Em Atraso', 'alert-triangle', formatMoney(overdueOpen), '#dc2626', '#fef2f2')}
          ${renderStatCard('Congelados', 'snowflake', countByStatus('FROZEN'), '#0ea5e9', '#f0f9ff')}
          ${renderStatCard('Desativados', 'user-x', countByStatus('DEACTIVATED'), '#94a3b8', '#f8fafc')}
        </div>

        <div class="stats-grid-4">
          ${renderStatCard('Total Faturado', 'dollar-sign', formatMoney(totalDue), '#0f172a', '#f1f5f9')}
          ${renderStatCard('Total Recebido', 'trending-up', formatMoney(receivedYear), '#16a34a', '#f0fdf4')}
          ${renderStatCard('Total Pendente', 'clock', formatMoney(pendingOpen), '#d97706', '#fffbeb')}
          ${renderStatCard('Total em Atraso', 'alert-triangle', formatMoney(overdueOpen), '#dc2626', '#fef2f2')}
        </div>

        <div class="dashboard-cols-2-1">
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Faturação Mensal</h3>
                <p class="card-subtitle">Recebido vs. Pendente</p>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; padding: 4px 0;">
              <div class="status-breakdown-list">
                ${statusData.map(s => `
                  <div class="status-bar-row">
                    <div class="status-bar-label-wrap">
                      <div class="status-bar-label">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${s.color};"></span>
                        <span>${s.label}</span>
                      </div>
                      <span class="font-mono" style="font-size: 11px; color: var(--muted-foreground);">${s.isMoney ? formatMoney(s.count) : s.count}</span>
                    </div>
                    <div class="status-bar-track">
                      <div class="status-bar-fill" style="background-color: ${s.color}; width: ${Math.min(100, (Number(s.count) / Math.max(1, totalDue)) * 100)}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
              <div style="display: flex; align-items: center; gap: 16px; padding-top: 12px; border-top: 1px solid var(--border-subtle); font-size: 12px; color: var(--muted-foreground);">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 10px; height: 6px; border-radius: var(--radius-full); background: var(--primary);"></span> Recebido: ${formatMoney(receivedMonth)}
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="width: 10px; height: 6px; border-radius: var(--radius-full); background: var(--status-pending);"></span> Pendente: ${formatMoney(pendingOpen)}
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Estado dos Clientes</h3>
                <p class="card-subtitle">Distribuição atual</p>
              </div>
            </div>
            <div class="status-breakdown-list">
              ${statusDist.map(s => `
                <div class="status-bar-row">
                  <div class="status-bar-label-wrap">
                    <div class="status-bar-label">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${s.color};"></span>
                      <span>${s.label}</span>
                    </div>
                    <span class="font-mono" style="font-size: 11px; color: var(--muted-foreground);">${s.value}</span>
                  </div>
                  <div class="status-bar-track">
                    <div class="status-bar-fill" style="background-color: ${s.color}; width: ${Math.min(100, (Number(s.value) / Math.max(1, (data?.clients || []).reduce((acc, c) => acc + c._count._all, 0))) * 100)}%;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="dashboard-cols-2-1">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Pagamentos Recentes</h3>
              <a href="#/pagamentos" class="btn btn-sm btn-ghost">
                Ver todos ${Icons.get('arrow-right', 13)}
              </a>
            </div>
            ${recentPayments.length ? `
              <div class="table-wrapper">
                <table class="table">
                  <thead>
                    <tr><th>Cliente</th><th>Valor</th><th>Data</th></tr>
                  </thead>
                  <tbody>
                    ${recentPayments.map(p => `
                      <tr>
                        <td>
                          <a href="#/clientes/${encodeURIComponent(p.clientId)}" style="font-weight:500;color:var(--foreground);text-decoration:none;">${escapeHtml(p.client?.fullName || p.clientId)}</a>
                          <span class="font-mono" style="display:block;font-size:11px;color:var(--muted-foreground);">${escapeHtml(p.client?.clientNumber || '')}</span>
                        </td>
                        <td class="font-mono">${formatMoney(p.amount)}</td>
                        <td style="font-size:12px;white-space:nowrap;">${formatDateTime(p.paidAt)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : renderEmptyState('credit-card', 'Os pagamentos recentes aparecerão aqui', 'Registe um pagamento para começar')}
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Ações Rápidas</h3>
              </div>
              <div class="quick-actions-grid">
                ${quickActions.map(a => `
                  <a ${a.href ? `href="${a.href}"` : `onclick="Pages.${a.action}()"`} class="quick-action-btn">
                    <span class="quick-action-icon-circle">
                      ${Icons.get(a.icon, 15)}
                    </span>
                    <span>${a.label}</span>
                  </a>
                `).join('')}
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Alertas</h3>
              </div>
              ${overdueOpen > 0
                ? `<div class="alert-banner alert-banner-warning">${Icons.get('alert-triangle', 18)}<span>Valores em atraso totalizando ${formatMoney(overdueOpen)} — ver <a href="#/pendencias">pendências</a></span></div>`
                : renderEmptyState('alert-triangle', 'Sem alertas', 'O sistema está a funcionar normalmente')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindDashboardPeriod() {
    const container = document.getElementById('dashboard-period-btns');
    if (!container) return;
    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const period = btn.getAttribute('data-period');
        if (period === 'week') {
          UI.showToast('Filtro semanal não suportado pelo backend atual.', 'error');
          return;
        }
        _dashboardPeriod = period;
        Router.navigate('#/');
      });
    });
  }

  let _dashboardTimer = null;

  function bindDashboardAutoRefresh() {
    if (_dashboardTimer) clearInterval(_dashboardTimer);
    _dashboardTimer = null;
    const mounted = () => !!document.getElementById('dashboard-period-btns');
    const refresh = () => {
      if (!mounted()) { if (_dashboardTimer) clearInterval(_dashboardTimer); _dashboardTimer = null; return; }
      updateDashboardStats();
    };
    _dashboardTimer = setInterval(refresh, 30000);
  }

  function setStatCardValue(label, value) {
    const cards = document.querySelectorAll('.stat-card');
    for (const card of cards) {
      const labelEl = card.querySelector('.stat-card-label');
      if (labelEl && labelEl.textContent.trim() === label) {
        const valueEl = card.querySelector('.stat-card-value');
        if (valueEl) valueEl.textContent = value;
        return;
      }
    }
  }

  async function updateDashboardStats() {
    const container = document.getElementById('dashboard-period-btns');
    if (!container) return;
    const year = new Date().getUTCFullYear();
    const month = _dashboardPeriod === 'month' ? new Date().getUTCMonth() + 1 : undefined;
    const data = await loadDashboardData(year, month);
    if (!data || !document.getElementById('dashboard-period-btns')) return;

    const countByStatus = (status) => {
      const found = (data.clients || []).find(c => c.status === status);
      return found ? found._count._all : 0;
    };
    const financialByStatus = (status) => {
      return (data.financial || []).find(f => f.financialStatus === status) || { _sum: { amountDue: 0, amountPaid: 0, amountOpen: 0 } };
    };
    const totalDue = (data.financial || []).reduce((acc, f) => acc + Number(f._sum.amountDue || 0), 0);
    const pendingOpen = Number(financialByStatus('PENDING')._sum.amountOpen || 0);
    const overdueOpen = Number(financialByStatus('OVERDUE')._sum.amountOpen || 0);
    const receivedYear = Number(data.receivedYear || 0);
    const receivedMonth = Number(data.receivedMonth || 0);
    const totalPaid = Number(financialByStatus('PAID')._sum.amountPaid || 0);

    setStatCardValue('Clientes Ativos', countByStatus('ACTIVE'));
    setStatCardValue('Pagos', formatMoney(totalPaid));
    setStatCardValue('Pendentes', formatMoney(pendingOpen));
    setStatCardValue('Em Atraso', formatMoney(overdueOpen));
    setStatCardValue('Congelados', countByStatus('FROZEN'));
    setStatCardValue('Desativados', countByStatus('DEACTIVATED'));
    setStatCardValue('Total Faturado', formatMoney(totalDue));
    setStatCardValue('Total Recebido', formatMoney(receivedYear));
    setStatCardValue('Total Pendente', formatMoney(pendingOpen));
    setStatCardValue('Total em Atraso', formatMoney(overdueOpen));

    const alertBox = document.querySelector('.dashboard-cols-2-1 .alert-banner span a[href="#/pendencias"]');
    if (alertBox) {
      const parent = alertBox.closest('.alert-banner');
      if (parent) {
        const text = parent.querySelector('span');
        if (text) text.innerHTML = `Valores em atraso totalizando ${formatMoney(overdueOpen)} — ver <a href="#/pendencias">pendências</a>`;
      }
    }
  }

  // ─── 2. Clients ───────────────────────────────────────────────────────────

  const CLIENT_LIST_LIMIT = 5000;

  async function fetchAllClients(status) {
    const params = {};
    if (status) params.status = status;
    return (await API.clients.list({ ...params, limit: CLIENT_LIST_LIMIT })) || [];
  }

  function clientMatchesTerm(client, term) {
    if (!term) return true;
    const t = term.toLowerCase();
    return [client.id, client.fullName, client.clientNumber, client.phone, client.email]
      .some((field) => field != null && String(field).toLowerCase().includes(t));
  }

  async function renderClients() {
    const columns = ['Cliente', 'Nº Cliente', 'Telefone', 'Estado', 'Criado em', 'Ações'];
    let clients = [];
    try {
      clients = await fetchAllClients();
    } catch { /* toast already shown */ }

    const rows = clients.map((client) => clientRow(client, columns.length)).join('');

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Clientes',
          'Gestão de todos os clientes',
          `
            <a href="#/clientes/novo" class="btn btn-sm btn-primary">
              ${Icons.get('plus', 14)} Novo cliente
            </a>
          `
        )}

        <div class="filter-bar" id="clients-filter-bar">
          <div class="input-wrap filter-input-search">
            <span class="input-icon-left">${Icons.get('search', 14)}</span>
            <input type="text" id="clients-search-input" class="form-input has-icon-left" placeholder="Pesquisar por ID, nome, número, telefone ou email..." />
          </div>
          <div style="width: 150px;">
            <select class="form-select" id="clients-status-filter">
              <option value="">Todos os estados</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="DEACTIVATED">Desativado</option>
              <option value="CLOSED">Encerrado</option>
            </select>
          </div>
          <button class="btn btn-sm btn-outline" onclick="Pages.filterClientsTable()">
            ${Icons.get('filter', 13)} Filtrar
          </button>
          <button class="btn btn-sm btn-ghost" onclick="Pages.clearClientsFilters()">
            ${Icons.get('x', 13)} Limpar
          </button>
        </div>

        <div class="card card-no-padding">
          <div style="padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
            <p style="font-size: 12px; color: var(--muted-foreground);">Todos os clientes — <strong id="clients-count-label">${clients.length}</strong> registos</p>
          </div>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${columns.map(col => `<th>${col}</th>`).join('')}
                </tr>
              </thead>
              <tbody id="clients-table-body">
                ${rows || `
                  <tr>
                    <td colspan="${columns.length}">
                      ${renderEmptyState(
                        'users',
                        'Ainda não existem clientes',
                        'Adicione o primeiro cliente para começar a gerir o ginásio',
                        `<a href="#/clientes/novo" class="btn btn-sm btn-primary">${Icons.get('plus', 14)} Adicionar cliente</a>`
                      )}
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <div class="pagination-wrap">
            <p>Página 1 de 1 — <strong id="clients-pagination-count">${clients.length}</strong> registos</p>
          </div>
        </div>
      </div>
    `;
  }

  function clientRow(client, colCount) {
    return `
      <tr class="hoverable" onclick="window.location.hash = '#/clientes/${client.id}'">
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: var(--accent-foreground); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">
              ${getInitials(client.fullName)}
            </div>
            <div>
              <p style="font-weight: 500; color: var(--foreground);">${escapeHtml(client.fullName)}</p>
              <p style="font-size: 11px; color: var(--muted-foreground);">${escapeHtml(client.email || client.phone || '—')}</p>
            </div>
          </div>
        </td>
        <td><span class="font-mono" style="font-size: 12px;">${escapeHtml(client.clientNumber)}</span></td>
        <td>${escapeHtml(client.phone || '—')}</td>
        <td>
          <span class="badge ${statusBadgeClass(client.status)}">
            <span class="badge-dot"></span> ${statusLabel(client.status)}
          </span>
        </td>
        <td style="font-size: 13px; color: var(--secondary-foreground);">${formatDate(client.createdAt)}</td>
        <td>
          <div class="action-btns-group" onclick="event.stopPropagation()">
            <a href="#/clientes/${client.id}" class="btn btn-icon-sm btn-ghost" title="Ver perfil">${Icons.get('eye', 14)}</a>
            ${client.status === 'ACTIVE' || client.status === 'FROZEN'
              ? `<button class="btn btn-icon-sm btn-ghost" style="color: var(--danger);" title="Desativar" onclick="Pages.confirmDeactivateClient('${client.id}', '${escapeHtml(client.fullName).replace(/'/g, "\\'")}')">${Icons.get('user-x', 14)}</button>`
              : ''
            }
          </div>
        </td>
      </tr>
    `;
  }

  function bindClientsPage() {
    try {
      const input = document.getElementById('clients-search-input');
      if (!input.dataset.searchBound) {
        input.dataset.searchBound = 'true';
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') filterClientsTable();
        });
      }
    } catch { /* ignore */ }
    try {
      const saved = sessionStorage.getItem('solve_header_search');
      if (saved) {
        sessionStorage.removeItem('solve_header_search');
        const input = document.getElementById('clients-search-input');
        if (input) {
          input.value = saved;
          filterClientsTable();
        }
      }
    } catch { /* ignore */ }
    loadNewClientPlans();
  }

  async function loadNewClientPlans() {
    const select = document.getElementById('new-client-planId');
    if (!select || select.dataset.loaded === 'true') return;
    select.dataset.loaded = 'true';
    select.disabled = true;
    try {
      const plans = await API.plans.list();
      const active = (plans || []).filter(p => p.isActive !== false);
      if (!active.length) {
        select.innerHTML = '<option value="">Sem planos disponíveis</option>';
      } else {
        select.innerHTML = '<option value="">Selecionar plano...</option>' + active.map(p => `
          <option value="${p.id}" data-price="${p.price}" data-lessons="${p.lessonsPerPeriod ?? ''}" data-months="${p.validityMonths || 1}" data-unlimited="${p.isUnlimited ? '1' : '0'}">
            ${escapeHtml(p.name)} — ${formatMoney(p.price)} (${p.isUnlimited ? 'Acesso livre' : `${p.lessonsPerPeriod ?? '—'} aulas`})
          </option>
        `).join('');
      }
      select.disabled = false;
      select.addEventListener('change', updateNewClientPlanSummary);
      updateNewClientPlanSummary();
    } catch {
      select.innerHTML = '<option value="">Não foi possível carregar os planos</option>';
      select.disabled = false;
    }
  }

  function updateNewClientPlanSummary() {
    const select = document.getElementById('new-client-planId');
    const summary = document.getElementById('new-client-plan-summary');
    if (!select || !summary) return;
    const option = select.selectedOptions?.[0];
    if (!option || !option.value) { summary.innerHTML = ''; return; }
    const months = Number(option.dataset.months || 1);
    const unlimited = option.dataset.unlimited === '1';
    const lessons = option.dataset.lessons;
    summary.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: var(--radius-sm); background: rgba(16,185,129,.08);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: var(--muted-foreground);">Mensalidade</span>
          <span class="font-mono" style="font-size: 14px; font-weight: 600; color: var(--primary);">${formatMoney(option.dataset.price)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: var(--muted-foreground);">Duração</span>
          <span style="font-size: 13px; font-weight: 500; color: var(--foreground);">${months} ${months === 1 ? 'mês' : 'meses'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 12px; color: var(--muted-foreground);">Aulas por período</span>
          <span style="font-size: 13px; font-weight: 500; color: var(--foreground);">${unlimited ? 'Acesso livre' : `${lessons || '—'} aulas`}</span>
        </div>
      </div>
    `;
  }

  async function filterClientsTable() {
    const search = document.getElementById('clients-search-input')?.value.trim();
    const status = document.getElementById('clients-status-filter')?.value;
    const body = document.getElementById('clients-table-body');
    const countLabel = document.getElementById('clients-count-label');
    const paginationCount = document.getElementById('clients-pagination-count');
    if (!body) return;
    body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;"><div style="width:28px; height:28px; border:3px solid var(--primary-muted); border-top-color:var(--primary); border-radius:50%; animation:spinner-rotate 0.7s linear infinite; margin:0 auto;"></div></td></tr>`;

    try {
      const all = await fetchAllClients(status);
      const clients = all.filter((c) => clientMatchesTerm(c, search));
      if (!clients.length) {
        body.innerHTML = `<tr><td colspan="6">${renderEmptyState('users', 'Sem resultados', 'Nenhum cliente corresponde aos filtros')}</td></tr>`;
      } else {
        body.innerHTML = clients.map(c => clientRow(c, 6)).join('');
      }
      if (countLabel) countLabel.textContent = clients.length;
      if (paginationCount) paginationCount.textContent = clients.length;
    } catch {
      body.innerHTML = `<tr><td colspan="6">${renderEmptyState('alert-circle', 'Erro ao carregar clientes', '', '<button class="btn btn-sm btn-outline" onclick="Pages.filterClientsTable()">Tentar de novo</button>')}</td></tr>`;
    }
  }

  function clearClientsFilters() {
    const searchInput = document.getElementById('clients-search-input');
    const statusFilter = document.getElementById('clients-status-filter');
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    filterClientsTable();
  }

  // ─── 3. New Client Form ───────────────────────────────────────────────────

  function renderNewClient() {
    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="#/clientes" class="btn btn-sm btn-ghost">
            ${Icons.get('arrow-left', 14)} Voltar
          </a>
          <div class="breadcrumbs">
            <a href="#/">Dashboard</a>
            <span class="breadcrumbs-sep">/</span>
            <a href="#/clientes">Clientes</a>
            <span class="breadcrumbs-sep">/</span>
            <span class="breadcrumbs-current">Novo Cliente</span>
          </div>
        </div>

        ${renderSectionHeader('Novo Cliente', 'Preencha os dados para criar um novo cliente')}

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Dados Pessoais</h3>
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Nome completo *</label>
                  <input type="text" class="form-input" id="new-client-fullName" placeholder="Nome do cliente" />
                </div>
                <div class="form-group">
                  <label class="form-label">Número de cliente</label>
                  <input type="text" class="form-input" placeholder="Gerado automaticamente" disabled />
                </div>
                <div class="form-group">
                  <label class="form-label">Telefone</label>
                  <input type="tel" class="form-input" id="new-client-phone" placeholder="+258 84 000 0000" />
                </div>
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-input" id="new-client-email" placeholder="email@exemplo.com" />
                </div>
                <div class="form-group">
                  <label class="form-label">Data de nascimento</label>
                  <input type="date" class="form-input" id="new-client-birthDate" />
                </div>
                <div class="form-group">
                  <label class="form-label">NIF</label>
                  <input type="text" class="form-input" id="new-client-taxId" placeholder="000 000 000" />
                </div>
                <div class="form-group">
                  <label class="form-label">Género</label>
                  <select class="form-select" id="new-client-gender">
                    <option value="">Selecionar...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Acesso</h3>
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Número do cartão</label>
                  <input type="text" class="form-input" id="new-client-cardNumber" placeholder="Para leitura biométrica" />
                </div>
                <div class="form-group">
                  <label class="form-label">PIN do dispositivo</label>
                  <input type="text" class="form-input" id="new-client-devicePin" placeholder="PIN ZKTeco" />
                </div>
                <div class="form-group">
                  <label class="form-label">Limite de entradas</label>
                  <input type="number" class="form-input" id="new-client-accessLimit" value="0" min="-1" title="Número de entradas por ciclo (-1 = ilimitado)" />
                </div>
                <div class="form-group">
                  <label class="form-label">Tolerância de acesso</label>
                  <input type="number" class="form-input" id="new-client-accessTolerance" value="2" min="0" title="Ciclos de tolerância permitidos" />
                </div>
              </div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Plano de Treino</h3>
              </div>
              <div class="form-group" style="margin-top: 4px;">
                <label class="form-label">Plano *</label>
                <select class="form-select" id="new-client-planId" disabled>
                  <option value="">Carregando planos...</option>
                </select>
              </div>
              <div id="new-client-plan-summary" style="margin-top: 10px;"></div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Fotografia</h3>
              </div>
              <div style="aspect-ratio: 1; border-radius: var(--radius-md); border: 2px dashed var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all var(--transition-fast);">
                <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--muted); display: flex; align-items: center; justify-content: center; color: var(--muted-foreground);">
                  ${Icons.get('user', 20)}
                </div>
                <p style="font-size: 12px; color: var(--muted-foreground); text-align: center;">Clique para adicionar<br />fotografia</p>
              </div>
            </div>

            <div class="card" style="display: flex; flex-direction: column; gap: 8px;">
              <button class="btn btn-md btn-primary btn-w-full" onclick="Pages.submitNewClient()">
                Guardar cliente
              </button>
              <a href="#/clientes" class="btn btn-md btn-outline btn-w-full">
                Cancelar
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function submitNewClient() {
    const fullName = document.getElementById('new-client-fullName')?.value?.trim();
    if (!fullName) { UI.showToast('Preencha o nome do cliente.', 'error'); return; }

    const planId = document.getElementById('new-client-planId')?.value;
    if (!planId) { UI.showToast('Escolha o plano de treino do cliente.', 'error'); return; }

    const val = (id) => { const v = document.getElementById(id)?.value?.trim(); return v || undefined; };
    const numVal = (id, fallback) => { const v = document.getElementById(id)?.value?.trim(); return v !== undefined && v !== '' ? Number(v) : fallback; };

    const payload = { fullName };
    if (val('new-client-phone')) payload.phone = val('new-client-phone');
    if (val('new-client-email')) payload.email = val('new-client-email');
    if (val('new-client-birthDate')) payload.birthDate = val('new-client-birthDate');
    if (val('new-client-taxId')) payload.taxId = val('new-client-taxId');
    const genderVal = val('new-client-gender');
    if (genderVal) payload.gender = genderVal;
    if (val('new-client-cardNumber')) payload.cardNumber = val('new-client-cardNumber');
    if (val('new-client-devicePin')) payload.devicePin = val('new-client-devicePin');
    payload.accessLimit = numVal('new-client-accessLimit', 0);
    payload.accessTolerance = numVal('new-client-accessTolerance', 2);

    UI.showToast('A criar cliente...', 'info');
    try {
      const created = await API.clients.create(payload);
      const now = new Date();
      const startedOn = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const planSelect = document.getElementById('new-client-planId');
      const selectedOption = planSelect?.selectedOptions?.[0];
      const months = Number(selectedOption?.dataset?.months || 1);
      try {
        await API.subscriptions.create({
          clientId: created.id,
          planId,
          startedOn,
          months,
          changeReason: 'Registo inicial'
        });
      } catch (subscriptionError) {
        UI.showToast('Cliente criado, mas não foi possível atribuir o plano. Associe o plano no perfil.', 'error', 5000);
      }
      UI.showToast(`Cliente ${created.clientNumber} criado com sucesso!`, 'success');
      window.location.hash = `#/clientes/${created.id}`;
    } catch (error) {
      UI.showToast(error.message || 'Erro ao criar cliente.', 'error');
    }
  }

  // ─── 4. Client Profile ────────────────────────────────────────────────────

  async function renderClientProfile(id = '') {
    if (!id) {
      return notFoundProfile();
    }
    const client = await API.clients.get(id);
    if (!client) return notFoundProfile();

    let lastAttendance = null;
    try { lastAttendance = await API.clients.lastAttendance(id); } catch { /* optional */ }

    const profileTabs = [
      { id: 'summary', label: 'Resumo' },
      { id: 'personal', label: 'Dados Pessoais' },
      { id: 'access', label: 'Acesso' },
      { id: 'plan', label: 'Plano Atual' },
      { id: 'payments', label: 'Pagamentos' },
      { id: 'events', label: 'Entradas & Saídas' },
    ];

    const lastPresenceText = lastAttendance ? formatDateTime(lastAttendance.occurredAt) : 'Nunca registado';
    const isDeactivatable = client.status === 'ACTIVE' || client.status === 'FROZEN';

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="#/clientes" class="btn btn-sm btn-ghost">
            ${Icons.get('arrow-left', 14)} Clientes
          </a>
          <div class="breadcrumbs">
            <a href="#/">Dashboard</a>
            <span class="breadcrumbs-sep">/</span>
            <a href="#/clientes">Clientes</a>
            <span class="breadcrumbs-sep">/</span>
            <span class="breadcrumbs-current">Perfil</span>
          </div>
        </div>

        <div class="card profile-header-card">
          <div class="profile-banner-stripe"></div>
          <div class="profile-header-content">
            <div class="profile-identity">
              <div class="profile-avatar-lg">
                ${getInitials(client.fullName)}
                <span class="profile-status-indicator"></span>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <h1 style="font-size: 18px; font-weight: 600; color: var(--foreground);">${escapeHtml(client.fullName)}</h1>
                  <span class="badge ${statusBadgeClass(client.status)}"><span class="badge-dot"></span> ${statusLabel(client.status)}</span>
                </div>
                <p class="font-mono" style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Nº ${escapeHtml(client.clientNumber)}</p>
                ${client.email ? `<p style="font-size: 12px; color: var(--secondary-foreground); margin-top: 2px;">${escapeHtml(client.email)}</p>` : ''}
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-sm btn-primary" onclick="Pages.openEditClientDrawer('${id}')">
                ${Icons.get('edit', 13)} Editar
              </button>
              <button class="btn btn-sm btn-outline" onclick="Pages.openPaymentDrawer('${id}')">
                ${Icons.get('credit-card', 13)} Registar Pagamento
              </button>
              <button class="btn btn-sm btn-outline" onclick="Pages.openRenewAccessDrawer('${id}', '${escapeHtml(client.fullName).replace(/'/g, "\\'")}', ${client.accessLimit}, ${client.accessDebt})">
                ${Icons.get('refresh-cw', 13)} Renovar Acesso
              </button>
              ${isDeactivatable ? `
                <button class="btn btn-sm btn-ghost" style="color: var(--danger);" onclick="Pages.confirmDeactivateClient('${id}', '${escapeHtml(client.fullName).replace(/'/g, "\\'")}')">
                  ${Icons.get('user-x', 13)} Desativar
                </button>
              ` : ''}
            </div>
          </div>

          <div class="profile-stats-bar">
            <div class="profile-stat-box">
              <p class="profile-stat-label">Estado</p>
              <p class="profile-stat-value">${statusLabel(client.status)}</p>
              <p class="profile-stat-sub">${client.createdAt ? formatDate(client.createdAt) : ''}</p>
            </div>
            <div class="profile-stat-box">
              <p class="profile-stat-label">Telefone</p>
              <p class="profile-stat-value" style="font-size: 13px;">${escapeHtml(client.phone || '—')}</p>
              <p class="profile-stat-sub">${client.gender ? `Género: ${client.gender}` : 'Sem género'}</p>
            </div>
            <div class="profile-stat-box">
              <p class="profile-stat-label">Última Presença</p>
              <p class="profile-stat-value" style="font-size: 13px;">${escapeHtml(lastPresenceText)}</p>
              <p class="profile-stat-sub">${lastAttendance ? statusLabel(lastAttendance.status) : 'Sem presenças'}</p>
            </div>
            <div class="profile-stat-box">
              <p class="profile-stat-label">NIF</p>
              <p class="profile-stat-value" style="font-size: 13px;">${escapeHtml(client.taxId || '—')}</p>
              <p class="profile-stat-sub">${client.birthDate ? `Nasc.: ${formatDate(client.birthDate)}` : 'Sem data de nascimento'}</p>
            </div>
          </div>
        </div>

        <div class="tabs-container" id="profile-tabs">
          ${profileTabs.map((t, i) => `
            <button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${t.id}">
              ${t.label}
            </button>
          `).join('')}
        </div>

        <div id="profile-tab-content">
          ${renderProfileSummary(client)}
        </div>
      </div>
    `;
  }

  function notFoundProfile() {
    return `
      <div class="page-container">
        ${renderEmptyState('user-x', 'Cliente não encontrado', 'O cliente solicitado não existe', `<a href="#/clientes" class="btn btn-sm btn-primary">${Icons.get('arrow-left', 14)} Voltar aos clientes</a>`)}
      </div>
    `;
  }

  function renderProfileSummary(client) {
    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Resumo</h3>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="info-box">
            <p class="info-label">Nome completo</p>
            <p class="info-value">${escapeHtml(client.fullName)}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Nº de cliente</p>
            <p class="info-value font-mono">${escapeHtml(client.clientNumber)}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Email</p>
            <p class="info-value">${escapeHtml(client.email || '—')}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Telefone</p>
            <p class="info-value">${escapeHtml(client.phone || '—')}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Data de nascimento</p>
            <p class="info-value">${formatDate(client.birthDate)}</p>
          </div>
          <div class="info-box">
            <p class="info-label">NIF</p>
            <p class="info-value">${escapeHtml(client.taxId || '—')}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Estado</p>
            <p class="info-value"><span class="badge ${statusBadgeClass(client.status)}"><span class="badge-dot"></span> ${statusLabel(client.status)}</span></p>
          </div>
          <div class="info-box">
            <p class="info-label">Criado em</p>
            <p class="info-value">${formatDateTime(client.createdAt)}</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderProfilePersonal(client) {
    return `
      <div class="card">
        <div class="card-header"><h3 class="card-title">Dados Pessoais</h3></div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
          <div class="info-box">
            <p class="info-label">Nome completo</p>
            <p class="info-value">${escapeHtml(client.fullName)}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Género</p>
            <p class="info-value">${escapeHtml(client.gender || '—')}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Data de nascimento</p>
            <p class="info-value">${formatDate(client.birthDate)}</p>
          </div>
          <div class="info-box">
            <p class="info-label">NIF</p>
            <p class="info-value">${escapeHtml(client.taxId || '—')}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Telefone</p>
            <p class="info-value">${escapeHtml(client.phone || '—')}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Email</p>
            <p class="info-value">${escapeHtml(client.email || '—')}</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderProfileAccess(client) {
    const isOnline = client.online;
    return `
      <div class="card">
        <div class="card-header"><h3 class="card-title">Acesso & Terminais</h3></div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="info-box">
            <p class="info-label">Estado online</p>
            <p class="info-value"><span class="terminal-online-dot ${isOnline ? 'is-online' : 'is-offline'}"></span> ${isOnline ? 'Online (no ginásio)' : 'Offline'}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Bloqueado</p>
            <p class="info-value">${client.accessBlocked ? 'Sim' : 'Não'}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Limite de entradas</p>
            <p class="info-value font-mono">${client.accessLimit === -1 ? 'Ilimitado' : client.accessLimit}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Entradas utilizadas</p>
            <p class="info-value font-mono">${client.accessCount}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Tolerância</p>
            <p class="info-value font-mono">${client.accessTolerance}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Dívida de tolerância</p>
            <p class="info-value font-mono">${client.accessDebt}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Cartão</p>
            <p class="info-value font-mono">${escapeHtml(client.cardNumber || '—')}</p>
          </div>
          <div class="info-box">
            <p class="info-label">PIN dispositivo</p>
            <p class="info-value font-mono">${escapeHtml(client.devicePin || '—')}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Início do ciclo</p>
            <p class="info-value">${formatDate(client.accessCycleStartedAt)}</p>
          </div>
        </div>
        <div style="margin-top: 16px;">
          <button class="btn btn-sm btn-outline" onclick="Pages.openRenewAccessDrawer('${client.id}', '${escapeHtml(client.fullName).replace(/'/g, "\\'")}', ${client.accessLimit}, ${client.accessDebt})">
            ${Icons.get('refresh-cw', 13)} Renovar ciclo de acesso
          </button>
        </div>
      </div>
    `;
  }

  function renderProfileOvg(client) {
    return `
      <div class="card">
        <div class="card-header"><h3 class="card-title">OVG</h3></div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="info-box">
            <p class="info-label">Nº cliente OVG</p>
            <p class="info-value">${escapeHtml(client.ovgCustomerNumber || '—')}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Sincronizado</p>
            <p class="info-value">${client.ovgSynchronized ? 'Sim' : 'Não'}</p>
          </div>
        </div>
      </div>
    `;
  }

  async function renderProfilePlan(clientId) {
    let subscription = null;
    try { subscription = await API.clients.subscription(clientId); } catch { /* toast */ }

    if (!subscription) {
      return renderNoticeBox(
        'Sem plano ativo',
        'Este cliente não tem qualquer subscrição ativa ou congelada.'
      );
    }

    const plan = subscription.plan;
    const totalOpen = (subscription.periods || []).reduce((a, p) => a + Number(p.amountOpen || 0), 0);
    const openStatus = subscription.periods?.[0];

    return `
      <div class="card">
        <div class="card-header"><h3 class="card-title">Plano Atual</h3>
          <span class="badge ${statusBadgeClass(subscription.status)}" style="margin-left:auto;"><span class="badge-dot"></span> ${statusLabel(subscription.status)}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div class="info-box">
            <p class="info-label">Plano</p>
            <p class="info-value">${plan ? escapeHtml(plan.name) : '—'}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Preço mensal</p>
            <p class="info-value font-mono">${plan ? formatMoney(plan.price) : '—'}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Aulas por período</p>
            <p class="info-value font-mono">${plan ? (plan.isUnlimited ? 'Ilimitado' : (plan.lessonsPerPeriod ?? '—')) : '—'}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Início da subscrição</p>
            <p class="info-value">${formatDate(subscription.startedOn)}</p>
          </div>
          ${openStatus ? `
            <div class="info-box">
              <p class="info-label">Período atual (${formatDate(openStatus.periodStart)} — ${formatDate(openStatus.periodEnd, { day: '2-digit', month: 'short', year: 'numeric' })})</p>
              <p class="info-value font-mono">${formatMoney(openStatus.amountOpen)} em aberto</p>
            </div>
          ` : ''}
        </div>
        ${totalOpen > 0 ? `
          <div style="margin-top: 16px;">
            <span class="badge badge-overdue"><span class="badge-dot"></span> Total em aberto: ${formatMoney(totalOpen)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  async function renderProfilePayments(clientId) {
    let payments = [];
    try { payments = await API.payments.list({ clientId, limit: 100, includeHistoric: true }); } catch { /* toast */ }
    const totalPaid = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
    const historicCount = payments.filter(p => p.isHistoric).length;
    return `
      <div class="card">
        <div class="card-header"><h3 class="card-title">Pagamentos</h3>
          <p style="margin-left:auto;font-size:12px;color:var(--muted-foreground);">Total: <strong>${formatMoney(totalPaid)}</strong> — ${payments.length} registos${historicCount ? ` · ${historicCount} históricos` : ''}</p>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr><th>Data</th><th>Valor</th><th>Método</th><th>Referência</th><th>Estado</th></tr>
            </thead>
            <tbody>
              ${payments.length ? payments.map(p => `
                <tr>
                  <td style="font-size:12px;white-space:nowrap;">${formatDateTime(p.paidAt)}</td>
                  <td class="font-mono">${formatMoney(p.amount)}</td>
                  <td>${statusLabel(p.method)}</td>
                  <td style="font-size:12px;">${escapeHtml(p.reference || '—')}</td>
                  <td><span class="badge ${statusBadgeClass(p.status)}"><span class="badge-dot"></span> ${statusLabel(p.status)}</span>${p.isHistoric ? ` <span class="badge" style="background:var(--muted);color:var(--muted-foreground);">Histórico</span>` : ''}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="5">${renderEmptyState('credit-card', 'Sem pagamentos registados')}</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function renderProfileEvents(clientId) {
    let events = [];
    try { events = await API.accessEvents.list({ clientId, limit: 100 }); } catch { /* toast */ }
    const entryEvents = events.filter(e => e.type === 'ENTRY');
    const exitEvents = events.filter(e => e.type === 'EXIT');
    const lastEntry = entryEvents[0];
    const lastExit = exitEvents[0];

    return `
      <div class="card">
        <div class="card-header"><h3 class="card-title">Entradas & Saídas</h3></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
          <div class="info-box">
            <p class="info-label">Última entrada</p>
            <p class="info-value" style="font-size:13px;">${lastEntry ? formatDateTime(lastEntry.occurredAt) : 'Nunca'}</p>
            <p class="info-sub">${lastEntry ? `Terminal: ${escapeHtml(lastEntry.terminal?.name || '—')}` : 'Sem registos'}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Última saída</p>
            <p class="info-value" style="font-size:13px;">${lastExit ? formatDateTime(lastExit.occurredAt) : 'Nunca'}</p>
            <p class="info-sub">${lastExit ? `Terminal: ${escapeHtml(lastExit.terminal?.name || '—')}` : 'Sem registos'}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Total entradas</p>
            <p class="info-value font-mono">${entryEvents.length}</p>
          </div>
          <div class="info-box">
            <p class="info-label">Total saídas</p>
            <p class="info-value font-mono">${exitEvents.length}</p>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr><th>Data e Hora</th><th>Tipo</th><th>Terminal</th><th>Resultado</th><th>Razão</th></tr>
            </thead>
            <tbody>
              ${events.length ? events.map(e => `
                <tr>
                  <td style="font-size:12px;white-space:nowrap;">${formatDateTime(e.occurredAt)}</td>
                  <td><span class="badge ${e.type === 'ENTRY' ? 'badge-paid' : 'badge-pending'}"><span class="badge-dot"></span> ${statusLabel(e.type)}</span></td>
                  <td style="font-size:12px;">${escapeHtml(e.terminal?.name || '—')}</td>
                  <td><span class="badge ${statusBadgeClass(e.result)}"><span class="badge-dot"></span> ${statusLabel(e.result)}</span></td>
                  <td style="font-size:12px;color:var(--muted-foreground);">${escapeHtml(e.reason || '—')}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="5">${renderEmptyState('clock', 'Sem eventos de acesso registados')}</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function renderProfileTabContent(tabId, clientId) {
    if (!clientId) return '<div class="card"><p style="padding:16px;font-size:13px;color:var(--muted-foreground);">ID do cliente não disponível.</p></div>';
    const client = await API.clients.get(clientId);
    if (!client) return '<div class="card"><p style="padding:16px;font-size:13px;color:var(--muted-foreground);">Cliente não encontrado.</p></div>';
    switch (tabId) {
      case 'summary': return renderProfileSummary(client);
      case 'personal': return renderProfilePersonal(client);
      case 'access': return renderProfileAccess(client);
      case 'plan': return renderProfilePlan(clientId);
      case 'payments': return renderProfilePayments(clientId);
      case 'events': return renderProfileEvents(clientId);
      default: return renderProfileSummary(client);
    }
  }

  async function openEditClientDrawer(clientId) {
    const client = await API.clients.get(clientId);
    if (!client) { UI.showToast('Cliente não encontrado.', 'error'); return; }
    const dateVal = client.birthDate ? client.birthDate.slice(0, 10) : '';
    const genderVal = client.gender || '';
    UI.openDrawer({
      title: 'Editar Cliente',
      subtitle: client.fullName,
      contentHtml: `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="form-group"><label class="form-label">Nome completo</label><input type="text" class="form-input" id="edit-client-fullName" value="${escapeHtml(client.fullName)}" /></div>
          <div class="form-group"><label class="form-label">Telefone</label><input type="tel" class="form-input" id="edit-client-phone" value="${escapeHtml(client.phone || '')}" /></div>
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="edit-client-email" value="${escapeHtml(client.email || '')}" /></div>
          <div class="form-group"><label class="form-label">NIF</label><input type="text" class="form-input" id="edit-client-taxId" value="${escapeHtml(client.taxId || '')}" /></div>
          <div class="form-group"><label class="form-label">Data de nascimento</label><input type="date" class="form-input" id="edit-client-birthDate" value="${dateVal}" /></div>
          <div class="form-group"><label class="form-label">Género</label>
            <select class="form-select" id="edit-client-gender"><option value="">Selecionar...</option><option value="M" ${genderVal==='M'?'selected':''}>Masculino</option><option value="F" ${genderVal==='F'?'selected':''}>Feminino</option><option value="OTHER" ${genderVal==='OTHER'?'selected':''}>Outro</option></select>
          </div>
          <div class="form-group"><label class="form-label">Nº cartão</label><input type="text" class="form-input" id="edit-client-cardNumber" value="${escapeHtml(client.cardNumber || '')}" /></div>
          <div class="form-group"><label class="form-label">PIN dispositivo</label><input type="text" class="form-input" id="edit-client-devicePin" value="${escapeHtml(client.devicePin || '')}" /></div>
          <div class="form-group"><label class="form-label">Limite entradas (-1 ilimitado)</label><input type="number" class="form-input" id="edit-client-accessLimit" value="${client.accessLimit}" min="-1" /></div>
          <div class="form-group"><label class="form-label">Tolerância acesso</label><input type="number" class="form-input" id="edit-client-accessTolerance" value="${client.accessTolerance}" min="0" /></div>
        </div>
      `,
      footerHtml: `<button class="btn btn-sm btn-ghost" onclick="UI.closeDrawer()">Cancelar</button><button class="btn btn-sm btn-primary" onclick="Pages.submitEditClient('${clientId}')">Guardar alterações</button>`
    });
  }

  async function submitEditClient(clientId) {
    const v = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    const nv = (id) => { const s = v(id); return s !== '' ? Number(s) : undefined; };
    const payload = {};
    if (v('edit-client-fullName')) payload.fullName = v('edit-client-fullName');
    const phone = v('edit-client-phone'); if (phone) payload.phone = phone;
    const email = v('edit-client-email'); if (email) payload.email = email;
    const taxId = v('edit-client-taxId'); if (taxId) payload.taxId = taxId;
    const birth = v('edit-client-birthDate'); if (birth) payload.birthDate = birth;
    const gender = v('edit-client-gender'); if (gender) payload.gender = gender;
    const card = v('edit-client-cardNumber'); if (card) payload.cardNumber = card;
    const pin = v('edit-client-devicePin'); if (pin) payload.devicePin = pin;
    if (nv('edit-client-accessLimit') !== undefined) payload.accessLimit = nv('edit-client-accessLimit');
    if (nv('edit-client-accessTolerance') !== undefined) payload.accessTolerance = nv('edit-client-accessTolerance');
    UI.showToast('A guardar alterações...', 'info');
    try {
      await API.clients.update(clientId, payload);
      UI.closeDrawer();
      UI.showToast('Dados atualizados com sucesso!', 'success');
      const hash = window.location.hash;
      if (hash.includes('/clientes/') && hash !== '#/clientes') { window.dispatchEvent(new HashChangeEvent('hashchange')); }
    } catch (error) {
      UI.showToast(error.message || 'Erro ao guardar.', 'error');
    }
  }

  // ─── 5. Plans ─────────────────────────────────────────────────────────────

  async function renderPlans() {
    let plans = [];
    let plansError = false;
    try { plans = await API.plans.list(); } catch { plansError = true; }

    const totalStudents = plans.reduce((sum, plan) => sum + (plan.activeStudents || 0), 0);
    const unlimitedCount = plans.filter(p => p.isUnlimited).length;

    const renderPlanCard = (plan) => `
      <div class="card" style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between;">
          <div>
            <p style="font-size: 15px; font-weight: 600; font-family: var(--font-heading); color: var(--foreground);">${escapeHtml(plan.name)}</p>
            <p style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">
              ${plan.isUnlimited ? 'Acesso livre' : `${plan.lessonsPerPeriod ?? '—'} aulas por período`}
            </p>
          </div>
          <span class="badge badge-paid"><span class="badge-dot"></span> Ativo</span>
        </div>
        <div style="padding-top: 12px; border-top: 1px solid var(--border-subtle); display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <div>
            <p style="font-size: 10px; color: var(--muted-foreground); text-transform: uppercase;">Preço</p>
            <p class="font-mono" style="font-size: 16px; font-weight: 600; color: var(--primary); margin-top: 2px;">${formatMoney(plan.price)}</p>
          </div>
          <div>
            <p style="font-size: 10px; color: var(--muted-foreground); text-transform: uppercase;">Validade</p>
            <p style="font-size: 13px; font-weight: 500; color: var(--foreground); margin-top: 2px;">${plan.validityMonths} ${plan.validityMonths === 1 ? 'mês' : 'meses'}</p>
          </div>
          <div>
            <p style="font-size: 10px; color: var(--muted-foreground); text-transform: uppercase;">Alunos ativos</p>
            <p style="font-size: 13px; font-weight: 600; color: var(--foreground); margin-top: 2px;">${plan.activeStudents ?? 0}</p>
          </div>
        </div>
        <div style="padding-top: 12px; border-top: 1px solid var(--border-subtle); display: flex; gap: 8px;">
          <button class="btn btn-sm btn-outline" style="flex: 1;" onclick="Pages.openPlanHistory('${plan.id}')">
            ${Icons.get('clock', 14)} Histórico
          </button>
          <button class="btn btn-sm btn-outline" onclick="Pages.openPlanDrawer('${plan.id}')">
            ${Icons.get('edit', 14)}
          </button>
        </div>
      </div>
    `;

    const stats = plans.length ? `
      <div class="stats-grid-4">
        ${renderStatCard('Planos ativos', 'file-text', plans.length, '#0f172a', '#f1f5f9')}
        ${renderStatCard('Alunos ativos (total)', 'users', totalStudents, '#16a34a', '#f0fdf4')}
        ${renderStatCard('Planos ilimitados', 'dumbbell', unlimitedCount, '#0ea5e9', '#f0f9ff')}
        ${renderStatCard('Preço médio (AOA)', 'dollar-sign', Math.round(plans.reduce((a, p) => a + Number(p.price), 0) / plans.length), '#d97706', '#fffbeb')}
      </div>
    ` : '';

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Planos',
          'Gestão de planos e mensalidades',
          `
            <button class="btn btn-sm btn-primary" onclick="Pages.openPlanDrawer()">
              ${Icons.get('plus', 14)} Novo plano
            </button>
          `
        )}

        ${stats}

        ${plansError ? `
          <div class="card" style="grid-column: 1 / -1;">
            ${renderEmptyState('alert-circle', 'Erro ao carregar planos', 'Não foi possível contactar o servidor.' + '<br/>Se o erro persistir, confirme se o servidor backend está em execução.')}
          </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
          ${plans.length ? plans.map(renderPlanCard).join('') : (plansError ? '' : `
            <div class="card" style="grid-column: 1 / -1;">
              ${renderEmptyState('file-text', 'Ainda não existem planos', 'Crie o primeiro plano.')}
            </div>
          `)}
        </div>
      </div>
    `;
  }

  function openPlanDrawer(planId = '') {
    const isEdit = Boolean(planId);
    const load = isEdit
      ? API.plans.get(planId).then(plan => ({ plan }))
      : Promise.resolve({ plan: null });

    load
      .then(({ plan }) => {
        const name = plan ? escapeHtml(plan.name) : '';
        const price = plan ? String(plan.price) : '';
        const lessons = plan ? (plan.lessonsPerPeriod ?? '') : '';
        const validity = plan ? plan.validityMonths : 1;
        const unlimited = plan ? !!plan.isUnlimited : false;

        UI.openDrawer({
          title: isEdit ? 'Editar plano' : 'Novo plano',
          subtitle: isEdit ? 'Consulta e gestão do plano' : 'Preencha os dados do novo plano',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${isEdit ? `
                <div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--radius-sm); background: var(--accent-subtle, rgba(16,185,129,.08));">
                  ${Icons.get('users', 18)}
                  <div>
                    <p style="font-size: 13px; font-weight: 600; color: var(--foreground);">${plan.activeStudents ?? 0} aluno(s) ativo(s)</p>
                    <p style="font-size: 11px; color: var(--muted-foreground);">${plan.history ? `${plan.history.length} registo(s) no histórico` : 'No histórico'}</p>
                  </div>
                </div>
              ` : ''}
              <div class="form-section">
                <p class="form-section-title">Dados do plano</p>
                <div class="form-group" style="margin-top: 10px;">
                  <label class="form-label">Nome *</label>
                  <input type="text" id="plan-name-input" class="form-input" value="${name}" placeholder="Ex: 2 aulas" />
                </div>
                <div class="form-grid-2" style="margin-top: 10px;">
                  <div class="form-group">
                    <label class="form-label">Preço (AOA) *</label>
                    <input type="number" step="0.01" min="0" id="plan-price-input" class="form-input" value="${price}" placeholder="0,00" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Validade (meses) *</label>
                    <input type="number" step="1" min="1" id="plan-validity-input" class="form-input" value="${validity}" />
                  </div>
                </div>
              </div>
              <div class="form-section">
                <p class="form-section-title">Aulas</p>
                <div class="form-group" style="margin-top: 10px;">
                  <label class="form-label">Aulas por período</label>
                  <input type="number" step="1" min="1" id="plan-lessons-input" class="form-input" value="${lessons}" placeholder="Deixe vazio para acesso livre" />
                  <p style="font-size: 11px; color: var(--muted-foreground); margin-top: 4px;">Planos ilimitados não indicam um número de aulas.</p>
                </div>
              </div>
            </div>
          `,
          footerHtml: `
            <button class="btn btn-sm btn-outline" onclick="UI.closeDrawer()">Cancelar</button>
            <button class="btn btn-sm btn-primary" id="plan-submit-btn" onclick="Pages.submitPlan('${planId}')">
              ${isEdit ? 'Guardar' : 'Criar plano'}
            </button>
          `
        });
      })
      .catch(() => {
        UI.showToast('Não foi possível carregar o plano.', 'error');
      });
  }

  async function submitPlan(planId = '') {
    const isEdit = Boolean(planId);
    const name = document.getElementById('plan-name-input')?.value?.trim();
    const price = Number(String(document.getElementById('plan-price-input')?.value || '').replace(',', '.'));
    const validityMonths = Number(document.getElementById('plan-validity-input')?.value || 1);
    const lessonsRaw = String(document.getElementById('plan-lessons-input')?.value || '').trim();

    if (!name) return UI.showToast('Introduza o nome do plano.', 'error');
    if (!price || price < 0) return UI.showToast('Introduza um preço válido.', 'error');
    if (!validityMonths || validityMonths < 1) return UI.showToast('A validade deve ser de pelo menos 1 mês.', 'error');

    const isUnlimited = lessonsRaw === '';
    const payload = { name, price, validityMonths, isUnlimited };
    if (!isUnlimited) {
      const lessons = Number(lessonsRaw);
      if (!lessons || lessons < 1) return UI.showToast('Indique o número de aulas ou deixe vazio para ilimitado.', 'error');
      payload.lessonsPerPeriod = lessons;
    } else {
      payload.lessonsPerPeriod = null;
    }

    if (isEdit) {
      return UI.showToast('A edição de planos ainda não está disponível. Crie um plano novo com os dados corrigidos.', 'info');
    }

    const btn = document.getElementById('plan-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'A criar...'; }

    try {
      await API.plans.create(payload);
      UI.closeDrawer();
      UI.showToast('Plano criado com sucesso.', 'success');
      setTimeout(() => refreshPlansPage(), 400);
    } catch (error) {
      if (btn) { btn.disabled = false; btn.textContent = 'Criar plano'; }
      UI.showToast(error.message || 'Falha ao criar o plano.', 'error');
    }
  }

  function openPlanHistory(planId) {
    UI.showToast('A carregar histórico...', 'info', 1200);
    API.plans.get(planId)
      .then(plan => {
        const rows = (plan.history || []).map(entry => `
          <tr>
            <td style="font-size: 12px; white-space: nowrap;">${formatDate(entry.validFrom)}</td>
            <td>
              <a href="#/clientes/${encodeURIComponent(entry.clientId)}" style="font-weight: 500; color: var(--foreground); text-decoration: none;">${escapeHtml(entry.clientName || '—')}</a>
              <span class="font-mono" style="display: block; font-size: 11px; color: var(--muted-foreground);">${escapeHtml(entry.clientNumber || '')}</span>
            </td>
            <td class="font-mono" style="font-size: 12px; font-weight: 600;">${formatMoney(entry.price)}</td>
            <td style="font-size: 12px; color: var(--muted-foreground);">${escapeHtml(entry.lessonsPerPeriod == null ? (entry.lessonsPerPeriod === null ? 'Acesso livre' : '—') : `${entry.lessonsPerPeriod} aulas`)}</td>
            <td style="font-size: 12px;">${escapeHtml(entry.changeReason || '—')}</td>
            <td style="font-size: 12px; color: var(--muted-foreground);">${escapeHtml(entry.changedByName || '—')}</td>
          </tr>
        `).join('');

        UI.openDrawer({
          title: `Histórico — ${escapeHtml(plan.name)}`,
          subtitle: `${plan.activeStudents ?? 0} aluno(s) ativo(s) no plano`,
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
                ${renderStatCard('Alunos ativos', 'users', plan.activeStudents ?? 0, '#16a34a', '#f0fdf4')}
                ${renderStatCard('Preço atual', 'dollar-sign', formatMoney(plan.price), '#0f172a', '#f1f5f9')}
                ${renderStatCard('Registos', 'clock', plan.history ? plan.history.length : 0, '#0ea5e9', '#f0f9ff')}
              </div>
              ${rows ? `
                <div class="card card-no-padding" style="overflow-x: auto;">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Desde</th>
                        <th>Cliente</th>
                        <th>Preço</th>
                        <th>Aulas</th>
                        <th>Motivo</th>
                        <th>Alterado por</th>
                      </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                  </table>
                </div>
              ` : renderEmptyState('clock', 'Sem histórico', 'Este plano ainda não tem registos.')}
            </div>
          `,
          footerHtml: `
            <button class="btn btn-sm btn-outline" onclick="UI.closeDrawer()">Fechar</button>
          `
        });
      })
      .catch(() => {
        UI.showToast('Não foi possível carregar o histórico do plano.', 'error');
      });
  }

  async function refreshPlansPage() {
    const area = document.getElementById('page-content');
    if (!area) return;
    area.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 50vh; flex-direction: column; gap: 12px;">
        <div style="width: 36px; height: 36px; border: 3px solid var(--primary-muted); border-top-color: var(--primary); border-radius: 50%; animation: spinner-rotate 0.7s linear infinite;"></div>
        <p style="font-size: 13px; color: var(--muted-foreground);">A carregar dados...</p>
      </div>
    `;
    try {
      area.innerHTML = await renderPlans();
    } catch {
      area.innerHTML = renderEmptyState('alert-circle', 'Erro ao carregar planos');
    }
  }

  // ─── 6. Payments ──────────────────────────────────────────────────────────

  async function renderPayments() {
    const data = await loadDashboardData();
    const financialByStatus = (status) => {
      return data?.financial?.find(f => f.financialStatus === status) || { _sum: { amountDue: 0, amountPaid: 0, amountOpen: 0 } };
    };
    const totalRecebido = Number(data?.receivedYear || 0);
    const pend = financialByStatus('PENDING');
    const overdue = financialByStatus('OVERDUE');
    const abiertoTotal = Number(pend._sum.amountOpen || 0) + Number(overdue._sum.amountOpen || 0);

    let payments = [];
    let paymentsError = false;
    let availableDays = [];
    const monthRange = paymentsMonthRange();
    try {
      const monthPayments = (await API.payments.list({ ...monthRange, limit: 300 })) || [];
      availableDays = [...new Set(monthPayments.map(p => new Date(p.paidAt).getUTCDate()))].sort((a, b) => a - b);
      if (_paymentsDay && availableDays.length && !availableDays.includes(_paymentsDay)) _paymentsDay = '';
      if (_paymentsDay) {
        payments = (await API.payments.list({ ...paymentsRange(), limit: 300 })) || [];
      } else {
        payments = monthPayments;
      }
    } catch {
      paymentsError = true;
      payments = [];
    }
    const periodTotal = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
    const periodCount = payments.length;
    const periodLabel = `${_paymentsDay ? `Dia ${_paymentsDay} de ` : ''}${monthOptionsLabel(_paymentsMonth)} ${_paymentsYear}`;
    const confirmedCount = payments.filter(p => p.status === 'CONFIRMED').length;

    const periodRows = payments.map(p => `
      <tr>
        <td style="font-size:12px;white-space:nowrap;">${formatDateTime(p.paidAt)}</td>
        <td>
          <a href="#/clientes/${encodeURIComponent(p.clientId)}" style="font-weight:500;color:var(--foreground);text-decoration:none;">${escapeHtml(p.client?.fullName || '—')}</a>
          <span class="font-mono" style="display:block;font-size:11px;color:var(--muted-foreground);">${escapeHtml(p.client?.clientNumber || '')}</span>
        </td>
        <td>${statusLabel(p.method)}</td>
        <td class="font-mono" style="font-weight:600;">${formatMoney(p.amount)}</td>
        <td style="font-size:12px;color:var(--muted-foreground);">${escapeHtml(p.reference || '—')}</td>
        <td><span class="badge ${statusBadgeClass(p.status)}"><span class="badge-dot"></span> ${statusLabel(p.status)}</span></td>
      </tr>
    `).join('');

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Pagamentos',
          'Registo e gestão de todos os pagamentos',
          `
            <button class="btn btn-sm btn-primary" onclick="Pages.openPaymentDrawer()">
              ${Icons.get('plus', 14)} Registar pagamento
            </button>
          `
        )}

        <div class="stats-grid-4">
          ${renderStatCard('Total Recebido (ano)', 'trending-up', formatMoney(totalRecebido), '#16a34a', '#f0fdf4')}
          ${renderStatCard(`Recebido em ${periodLabel}`, 'credit-card', formatMoney(periodTotal), '#0f172a', '#f1f5f9')}
          ${renderStatCard('Pagamentos no período', 'check-circle', periodCount, '#16a34a', '#f0fdf4')}
          ${renderStatCard('Confirmados', 'clock', confirmedCount, '#0ea5e9', '#f0f9ff')}
        </div>

        ${paymentsFilterHtml({ year: _paymentsYear, month: _paymentsMonth, day: _paymentsDay, availableDays, count: periodCount, total: periodTotal })}

        <div class="card card-no-padding">
          <div style="padding: 10px 16px; border-bottom: 1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <p style="font-size: 12px; color: var(--muted-foreground);">${paymentsError ? 'Não foi possível carregar os pagamentos.' : `Pagamentos registados — ${periodLabel} · ${periodCount} pagamentos · Total ${formatMoney(periodTotal)}`}</p>
            ${payments.length ? `<button class="btn btn-sm btn-ghost" onclick="Pages.exportPaymentsCsv()">${Icons.get('download', 13)} Exportar CSV</button>` : ''}
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Método</th>
                  <th>Valor</th>
                  <th>Referência</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${periodRows || `
                  <tr>
                    <td colspan="6">
                      ${renderEmptyState('credit-card', `Sem pagamentos em ${periodLabel}`, 'Registe um pagamento para começar')}
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card card-no-padding">
          <div style="padding: 10px 16px; border-bottom: 1px solid var(--border);">
            <p style="font-size: 12px; color: var(--muted-foreground);">Detalhe por estado financeiro — período atual</p>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Estado Financeiro</th>
                  <th>Faturado</th>
                  <th>Estado</th>
                  <th>Período</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                ${(data?.financial || []).map(f => `
                  <tr>
                    <td style="font-weight: 500; color: var(--foreground);">${statusLabel(f.financialStatus)}</td>
                    <td class="font-mono">${formatMoney(f._sum.amountDue || 0)}</td>
                    <td>
                      <span class="badge ${statusBadgeClass(f.financialStatus)}">
                        <span class="badge-dot"></span> ${statusLabel(f.financialStatus)}
                      </span>
                    </td>
                    <td>${new Date().getUTCFullYear()} / ${new Date().getUTCMonth() + 1}</td>
                    <td style="font-size: 12px; color: var(--muted-foreground);">Pago: ${formatMoney(f._sum.amountPaid || 0)} · Aberto: ${formatMoney(f._sum.amountOpen || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function bindPaymentsPage() {
    const yearSel = document.getElementById('payments-filter-year');
    const monthSel = document.getElementById('payments-filter-month');
    const daySel = document.getElementById('payments-filter-day');
    if (yearSel) yearSel.addEventListener('change', () => { _paymentsYear = parseInt(yearSel.value, 10); refreshPaymentsPage(); });
    if (monthSel) monthSel.addEventListener('change', () => { _paymentsMonth = parseInt(monthSel.value, 10); _paymentsDay = ''; refreshPaymentsPage(); });
    if (daySel) daySel.addEventListener('change', () => { _paymentsDay = daySel.value ? parseInt(daySel.value, 10) : ''; refreshPaymentsPage(); });
  }

  async function refreshPaymentsPage() {
    const area = document.getElementById('page-content');
    if (!area) return;
    area.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 50vh; flex-direction: column; gap: 12px;">
        <div style="width: 36px; height: 36px; border: 3px solid var(--primary-muted); border-top-color: var(--primary); border-radius: 50%; animation: spinner-rotate 0.7s linear infinite;"></div>
        <p style="font-size: 13px; color: var(--muted-foreground);">A carregar dados...</p>
      </div>
    `;
    try {
      area.innerHTML = await renderPayments();
    } catch {
      area.innerHTML = renderEmptyState('alert-circle', 'Erro ao carregar pagamentos');
    }
    bindPaymentsPage();
  }

  function resetPaymentsFilters() {
    _paymentsDay = '';
    refreshPaymentsPage();
  }

  async function exportPaymentsCsv() {
    try {
      const range = paymentsRange();
      const payments = (await API.payments.list({ ...range, limit: 300 })) || [];
      if (!payments.length) {
        UI.showToast('Sem pagamentos para exportar.', 'error');
        return;
      }
      localCsv(payments.map(p => ({
        data: p.paidAt,
        cliente: p.client?.fullName || '',
        numeroCliente: p.client?.clientNumber || '',
        metodo: statusLabel(p.method),
        valor: p.amount,
        referencia: p.reference || '',
        estado: statusLabel(p.status)
      })), `pagamentos-${_paymentsYear}${_paymentsMonth ? '-' + String(_paymentsMonth).padStart(2, '0') : ''}${_paymentsDay ? '-' + String(_paymentsDay).padStart(2, '0') : ''}.csv`);
    } catch {
      UI.showToast('Falha ao exportar pagamentos.', 'error');
    }
  }

  function monthOptionsLabel(month) {
    const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return names[month - 1] || '';
  }

  // ─── 7. Billing ───────────────────────────────────────────────────────────

  async function renderBilling() {
    const data = await loadDashboardData();
    const financialByStatus = (status) => {
      return data?.financial?.find(f => f.financialStatus === status) || { _sum: { amountDue: 0, amountPaid: 0, amountOpen: 0 } };
    };
    const totalDue = (data?.financial || []).reduce((acc, f) => acc + Number(f._sum.amountDue || 0), 0);
    const receivedYear = Number(data?.receivedYear || 0);
    const pendingOpen = Number(financialByStatus('PENDING')._sum.amountOpen || 0);
    const overdueOpen = Number(financialByStatus('OVERDUE')._sum.amountOpen || 0);

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Faturação',
          'Análise financeira e faturação',
          `
            <button class="btn btn-sm btn-outline" onclick="Pages.exportBillingExcel()">
              ${Icons.get('download', 13)} Exportar Excel (auditoria)
            </button>
          `
        )}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          ${renderStatCard('Total Faturado', 'dollar-sign', formatMoney(totalDue), '#0f172a', '#f1f5f9')}
          ${renderStatCard('Recebido (ano)', 'trending-up', formatMoney(receivedYear), '#16a34a', '#f0fdf4')}
          ${renderStatCard('Pendente', 'clock', formatMoney(pendingOpen), '#d97706', '#fffbeb')}
          ${renderStatCard('Em Atraso', 'alert-triangle', formatMoney(overdueOpen), '#dc2626', '#fef2f2')}
          ${renderStatCard('Em Aberto', 'dollar-sign', formatMoney(pendingOpen + overdueOpen), '#64748b', '#f8fafc')}
        </div>

        <div class="card card-no-padding">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Estado Financeiro</th>
                  <th>Faturado</th>
                  <th>Pago</th>
                  <th>Em Aberto</th>
                </tr>
              </thead>
              <tbody>
                ${(data?.financial || []).map(f => `
                  <tr>
                    <td><span class="badge ${statusBadgeClass(f.financialStatus)}"><span class="badge-dot"></span> ${statusLabel(f.financialStatus)}</span></td>
                    <td class="font-mono">${formatMoney(f._sum.amountDue || 0)}</td>
                    <td class="font-mono">${formatMoney(f._sum.amountPaid || 0)}</td>
                    <td class="font-mono">${formatMoney(f._sum.amountOpen || 0)}</td>
                  </tr>
                `).join('') || `
                  <tr>
                    <td colspan="4">${renderEmptyState('bar-chart-2', 'Sem dados disponíveis', 'Os dados aparecerão após o primeiro registo')}</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ─── 8. Attendance (Presenças) ────────────────────────────────────────────

  async function exportBillingExcel() {
    if (typeof Excel === 'undefined') { UI.showToast('Módulo Excel não carregado.', 'error'); return; }
    UI.showToast('A preparar relatório Excel...', 'info');
    try {
      const [data, payments, clients] = await Promise.all([
        loadDashboardData(),
        API.payments.list({ limit: 300 }),
        fetchAllClients()
      ]);

      const wb = Excel.createWorkbook();
      const financial = data?.financial || [];
      const receivedMonth = Number(data?.receivedMonth || 0);
      const receivedYear = Number(data?.receivedYear || 0);
      const year = new Date().getUTCFullYear();
      const month = new Date().getUTCMonth() + 1;
      const financeFor = (s) => financial.find(f => f.financialStatus === s) || { _sum: { amountDue: 0, amountPaid: 0, amountOpen: 0 } };
      const totalDue = financial.reduce((a, f) => a + Number(f._sum.amountDue || 0), 0);
      const totalPaid = financial.reduce((a, f) => a + Number(f._sum.amountPaid || 0), 0);
      const totalOpen = financial.reduce((a, f) => a + Number(f._sum.amountOpen || 0), 0);
      const pendOpen = Number(financeFor('PENDING')._sum.amountOpen || 0);
      const overdueOpen = Number(financeFor('OVERDUE')._sum.amountOpen || 0);

      // ── Sheet 1: Resumo ──
      const resumo = wb.addSheet('Resumo', [34, 22]);
      resumo.row(['FATURAÇÃO — SOLVE ACESS / SAMORAFIT'], { title: true });
      resumo.row([`Relatório de auditoria contabilística gerado a ${new Date().toLocaleString('pt-PT')}`]);
      resumo.blank();
      resumo.row(['Período atual', `${year} / ${String(month).padStart(2, '0')}`]);
      resumo.moneyRow(['Total faturado (período)', totalDue]);
      resumo.moneyRow(['Total pago (período)', totalPaid]);
      resumo.moneyRow(['Total em aberto (período)', totalOpen]);
      resumo.moneyRow(['Recebido no mês', receivedMonth]);
      resumo.moneyRow(['Recebido no ano', receivedYear], { bold: true });
      resumo.blank();
      resumo.row(['Estado financeiro', 'Faturado', 'Pago', 'Em aberto'], { header: true });
      financial.forEach(f => resumo.moneyRow([
        statusLabel(f.financialStatus), Number(f._sum.amountDue || 0), Number(f._sum.amountPaid || 0), Number(f._sum.amountOpen || 0)
      ], { money: [1, 2, 3] }));
      resumo.moneyRow(['Total', totalDue, totalPaid, totalOpen], { money: [1, 2, 3], bold: true });
      resumo.blank();
      resumo.moneyRow(['Pendente (em aberto)', pendOpen]);
      resumo.moneyRow(['Em atraso (em aberto)', overdueOpen]);
      resumo.moneyRow(['Em aberto total', pendOpen + overdueOpen], { bold: true });

      // ── Sheet 2: Recebimentos ──
      const rec = wb.addSheet('Recebimentos', [20, 30, 14, 16, 18, 26, 14]);
      rec.row(['Data de pagamento', 'Cliente', 'Nº Cliente', 'Valor', 'Método', 'Referência', 'Estado'], { header: true });
      payments.forEach(p => {
        rec.row([
          new Date(p.paidAt), p.client?.fullName || '', p.client?.clientNumber || '',
          Number(p.amount || 0), statusLabel(p.method), p.reference || '', statusLabel(p.status)
        ], { money: [3], datetime: true });
      });
      const sumPayments = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
      rec.blank();
      rec.moneyRow([`Total de recebimentos (${payments.length} registos)`, '', '', sumPayments], { money: [3], bold: true });

      // ── Sheet 3: Clientes ──
      const cli = wb.addSheet('Clientes', [16, 34, 26, 18, 16, 16, 20]);
      cli.row(['Nº', 'Nome', 'Email', 'Telefone', 'NIF', 'Estado', 'Criado em'], { header: true });
      clients.forEach(c => {
        cli.row([
          c.clientNumber, c.fullName, c.email || '', c.phone || '', c.taxId || '',
          statusLabel(c.status), new Date(c.createdAt)
        ], { datetime: true });
      });

      wb.download(`faturacao_${year}-${String(month).padStart(2, '0')}.xlsx`);
      UI.showToast('Relatório Excel exportado.', 'success');
    } catch (error) {
      UI.showToast(error.message || 'Erro ao exportar Excel.', 'error');
    }
  }

  function attendanceRangeConfig() {
    if (_attendanceRange === 0) {
      const today = dateOnly(new Date());
      return { from: today, to: today };
    }
    if (_attendanceRange === 1) {
      const yesterday = dateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));
      return { from: yesterday, to: yesterday };
    }
    if (_attendanceRange === 7 || _attendanceRange === 30) {
      const to = dateOnly(new Date());
      const from = dateOnly(new Date(Date.now() - (_attendanceRange - 1) * 24 * 60 * 60 * 1000));
      return { from, to };
    }
    return { from: _attendanceFrom, to: _attendanceTo };
  }

  function dateOnly(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function renderAttendance() {
    const config = attendanceRangeConfig();
    let events = [];
    try {
      events = await API.accessEvents.list(config.from || config.to ? { from: `${config.from}T00:00:00.000Z`, to: `${config.to}T23:59:59.999Z`, limit: 500 } : { limit: 500 });
    } catch { /* toast */ }
    events = events || [];

    const todayKey = dateOnly(new Date());
    const yesterdayKey = dateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const entriesToday = events.filter(e => e.type === 'ENTRY' && (e.occurredAt || '').slice(0, 10) === todayKey).length;
    const entriesYesterday = events.filter(e => e.type === 'ENTRY' && (e.occurredAt || '').slice(0, 10) === yesterdayKey).length;
    const entriesMonth = events.filter(e => e.type === 'ENTRY' && (e.occurredAt || '').slice(0, 7) === todayKey.slice(0, 7)).length;
    const deniedCount = events.filter(e => e.result === 'DENIED').length;

    const label = _attendanceRange === 0 ? 'Hoje' : _attendanceRange === 1 ? 'Ontem' : _attendanceRange === 7 || _attendanceRange === 30 ? `Últimos ${_attendanceRange} dias` : `${config.from || '—'} até ${config.to || '—'}`;

    const rowsHtml = events.length ? events.map(e => `
      <tr>
        <td style="font-size:12px;white-space:nowrap;">${formatDateTime(e.occurredAt)}</td>
        <td style="font-weight:500;">${e.client ? escapeHtml(e.client.fullName) : '—'} <span class="font-mono" style="font-size:10px;color:var(--muted-foreground);">${e.client ? escapeHtml(e.client.clientNumber) : ''}</span></td>
        <td><span class="badge ${e.type === 'ENTRY' ? 'badge-paid' : 'badge-pending'}"><span class="badge-dot"></span> ${statusLabel(e.type)}</span></td>
        <td style="font-size:12px;">${escapeHtml(e.terminal?.name || '—')}</td>
        <td><span class="badge ${statusBadgeClass(e.result)}"><span class="badge-dot"></span> ${statusLabel(e.result)}</span></td>
      </tr>
    `).join('') : `
      <tr><td colspan="5">${renderEmptyState('calendar', 'Sem eventos de acesso no período', 'Ajuste o intervalo de datas para ver entradas e saídas dos dias anteriores.')}</td></tr>
    `;

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Presenças',
          'Relatório de entradas e saídas por período',
          `
            <button class="btn btn-sm btn-outline" onclick="Pages.exportAttendanceExcel()">
              ${Icons.get('download', 13)} Exportar Excel
            </button>
            <button class="btn btn-sm btn-outline" onclick="Pages.exportAttendanceCsv()">
              ${Icons.get('download', 13)} Exportar CSV
            </button>
          `
        )}

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#ffffff;border:1px solid var(--border);border-radius:var(--radius-md);padding:10px 12px;">
          <div id="attendance-range-btns" style="display:flex;align-items:center;gap:4px;">
            <button class="btn btn-sm ${_attendanceRange === 0 ? 'btn-primary' : 'btn-ghost'}" data-range="0">Hoje</button>
            <button class="btn btn-sm ${_attendanceRange === 1 ? 'btn-primary' : 'btn-ghost'}" data-range="1">Ontem</button>
            <button class="btn btn-sm ${_attendanceRange === 7 ? 'btn-primary' : 'btn-ghost'}" data-range="7">7 dias</button>
            <button class="btn btn-sm ${_attendanceRange === 30 ? 'btn-primary' : 'btn-ghost'}" data-range="30">30 dias</button>
            <button class="btn btn-sm ${_attendanceRange === 'custom' ? 'btn-primary' : 'btn-ghost'}" data-range="custom">Personalizado</button>
          </div>
          <div id="attendance-custom-inputs" style="display:${_attendanceRange === 'custom' ? 'flex' : 'none'};align-items:center;gap:6px;">
            <input type="date" class="form-input" id="attendance-from" value="${_attendanceFrom}" style="width:150px;" />
            <span style="font-size:12px;color:var(--muted-foreground);">até</span>
            <input type="date" class="form-input" id="attendance-to" value="${_attendanceTo}" style="width:150px;" />
          </div>
          <span style="margin-left:auto;font-size:12px;color:var(--muted-foreground);">Período: <strong>${label}</strong></span>
        </div>

        <div class="stats-grid-4">
          ${renderStatCard('Entradas hoje', 'log-in', entriesToday.toLocaleString('pt-PT'), '#16a34a', '#f0fdf4')}
          ${renderStatCard('Entradas ontem', 'calendar', entriesYesterday.toLocaleString('pt-PT'), '#0ea5e9', '#f0f9ff')}
          ${renderStatCard('Entradas este mês', 'calendar-check', entriesMonth.toLocaleString('pt-PT'), '#d97706', '#fffbeb')}
          ${renderStatCard('Acessos negados', 'lock', deniedCount.toLocaleString('pt-PT'), '#dc2626', '#fef2f2')}
        </div>

        <div class="card card-no-padding">
          <div style="padding:10px 16px;border-bottom:1px solid var(--border);">
            <p style="font-size:12px;color:var(--muted-foreground);">Eventos de acesso (entradas e saídas) — <strong>${events.length}</strong> registos</p>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr><th>Data e Hora</th><th>Cliente</th><th>Tipo</th><th>Terminal</th><th>Resultado</th></tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function bindAttendancePage() {
    const rangeBtns = document.getElementById('attendance-range-btns');
    if (rangeBtns) {
      rangeBtns.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const value = btn.getAttribute('data-range');
          _attendanceRange = value === 'custom' ? 'custom' : Number(value);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
      });
    }
    const fromInput = document.getElementById('attendance-from');
    const toInput = document.getElementById('attendance-to');
    if (fromInput && toInput) {
      const apply = () => {
        _attendanceFrom = fromInput.value;
        _attendanceTo = toInput.value;
        if (_attendanceFrom && _attendanceTo) window.dispatchEvent(new HashChangeEvent('hashchange'));
      };
      fromInput.addEventListener('change', apply);
      toInput.addEventListener('change', apply);
    }
  }

  async function exportAttendanceExcel() {
    if (typeof Excel === 'undefined') { UI.showToast('Módulo Excel não carregado.', 'error'); return; }
    const config = attendanceRangeConfig();
    let events = [];
    try {
      events = await API.accessEvents.list(config.from || config.to ? { from: `${config.from}T00:00:00.000Z`, to: `${config.to}T23:59:59.999Z`, limit: 500 } : { limit: 500 });
    } catch { /* toast */ }
    if (!events || !events.length) { UI.showToast('Sem eventos no período para exportar.', 'error'); return; }
    const wb = Excel.createWorkbook();
    const det = wb.addSheet('Presenças', [20, 30, 16, 24, 14]);
    det.row(['Data e Hora', 'Cliente', 'Tipo', 'Terminal', 'Resultado'], { header: true });
    events.forEach(e => det.row([
      new Date(e.occurredAt), e.client ? `${e.client.fullName} (${e.client.clientNumber})` : '', statusLabel(e.type), e.terminal?.name || '', statusLabel(e.result)
    ], { datetime: true }));
    const res = wb.addSheet('Resumo por dia', [14, 16]);
    res.row(['Dia', 'Entradas', 'Saídas'], { header: true });
    const byDay = new Map();
    events.forEach(e => {
      const day = (e.occurredAt || '').slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, { entries: 0, exits: 0 });
      if (e.type === 'ENTRY') byDay.get(day).entries++;
      else if (e.type === 'EXIT') byDay.get(day).exits++;
    });
    [...byDay.entries()].sort().forEach(([day, counts]) => res.row([day, counts.entries, counts.exits]));
    wb.download(`presencas_${config.from || 'todos'}_${config.to || ''}.xlsx`);
    UI.showToast('Relatório de presenças exportado.', 'success');
  }

  function exportAttendanceCsv() {
    const config = attendanceRangeConfig();
    API.accessEvents.list(config.from || config.to ? { from: `${config.from}T00:00:00.000Z`, to: `${config.to}T23:59:59.999Z`, limit: 500 } : { limit: 500 })
      .then(events => {
        if (!events || !events.length) { UI.showToast('Sem eventos no período para exportar.', 'error'); return; }
        localCsv(events.map(e => ({
          data: e.occurredAt,
          cliente: e.client?.fullName || '',
          numero: e.client?.clientNumber || '',
          tipo: statusLabel(e.type),
          terminal: e.terminal?.name || '',
          resultado: statusLabel(e.result)
        })), `presencas_${config.from || 'todos'}_${config.to || ''}.csv`);
      })
      .catch((error) => UI.showToast(error.message || 'Erro ao exportar CSV.', 'error'));
  }

  // ─── 9. Terminals (Reais) ────────────────────────────────────────────────

  async function renderTerminals() {
    let terminals = [];
    let units = [];
    try {
      [terminals, units] = await Promise.all([API.terminals.list(), API.units.list()]);
    } catch { /* toast */ }

    const now = Date.now();
    const total = terminals.length;
    const onlineCount = terminals.filter(t => t.isActive && t.lastSeenAt && (now - new Date(t.lastSeenAt).getTime()) < 5 * 60 * 1000).length;
    const entryCount = terminals.filter(t => t.type === 'ENTRY').length;
    const exitCount = terminals.filter(t => t.type === 'EXIT').length;
    const unitMap = Object.fromEntries(units.map(u => [u.id, u]));

    const rows = terminals.map(t => {
      const isOnline = t.isActive && t.lastSeenAt && (now - new Date(t.lastSeenAt).getTime()) < 5 * 60 * 1000;
      const unit = unitMap[t.unitId];
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: var(--radius-md); background: ${isOnline ? '#f0fdf4' : '#f8fafc'}; display: flex; align-items: center; justify-content: center; color: ${isOnline ? '#16a34a' : '#94a3b8'};">
                ${Icons.get('monitor', 16)}
              </div>
              <div>
                <p style="font-weight: 500; color: var(--foreground);">${escapeHtml(t.name)}</p>
                <p style="font-size: 11px; color: var(--muted-foreground);">${escapeHtml(t.serialNumber)}</p>
              </div>
            </div>
          </td>
          <td style="font-size: 12px;">${escapeHtml(t.model || '—')}</td>
          <td class="font-mono" style="font-size: 12px;">${escapeHtml(t.ipAddress || '—')}</td>
          <td class="font-mono" style="font-size: 12px;">${t.port || '—'}</td>
          <td>
            <span class="badge ${t.type === 'ENTRY' ? 'badge-paid' : 'badge-pending'}">
              <span class="badge-dot"></span> ${statusLabel(t.type)}
            </span>
          </td>
          <td style="font-size: 12px;">${escapeHtml(unit ? unit.name : '—')}</td>
          <td>
            <span class="badge ${t.isActive ? 'badge-paid' : 'badge-inactive'}">
              <span class="badge-dot"></span> ${t.isActive ? 'Ativo' : 'Inativo'}
            </span>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="terminal-online-dot ${isOnline ? 'is-online' : 'is-offline'}"></span>
              <span style="font-size: 12px;">${isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </td>
          <td style="font-size: 12px; color: var(--muted-foreground);">${formatDateTime(t.lastSeenAt)}</td>
        </tr>
      `;
    }).join('');

    const columns = ['Nome', 'Modelo', 'IP', 'Porta', 'Tipo', 'Unidade', 'Estado', 'Online', 'Última Atividade'];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Terminais de Acesso',
          'Gestão dos terminais ZKTeco',
          `
            <button class="btn btn-sm btn-primary" onclick="Pages.openTerminalDrawer()">
              ${Icons.get('plus', 14)} Novo terminal
            </button>
          `
        )}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          ${renderStatCard('Total terminais', 'monitor', total, '#0f172a', '#f1f5f9')}
          ${renderStatCard('Online', 'wifi', onlineCount, '#16a34a', '#f0fdf4')}
          ${renderStatCard('Entrada', 'log-in', entryCount, '#0ea5e9', '#f0f9ff')}
          ${renderStatCard('Saída', 'log-out', exitCount, '#d97706', '#fffbeb')}
        </div>

        <div class="card card-no-padding">
          <div style="padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
            <p style="font-size: 12px; color: var(--muted-foreground);">Terminais registados — <strong>${total}</strong> registos</p>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${columns.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows || `
                  <tr>
                    <td colspan="${columns.length}">
                      ${renderEmptyState('monitor', 'Ainda não existem terminais', 'Registe o primeiro terminal para começar a controlar acessos', `<button class="btn btn-sm btn-primary" onclick="Pages.openTerminalDrawer()">${Icons.get('plus', 13)} Registar terminal</button>`)}
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function openTerminalDrawer() {
    API.units.list().then(units => {
      const unitOptions = units.map(u => `<option value="${u.id}">${escapeHtml(u.name)} (${escapeHtml(u.code)})</option>`).join('');
      UI.openDrawer({
        title: 'Registar Terminal',
        subtitle: 'Adicionar um novo terminal ZKTeco',
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="form-section">
              <p class="form-section-title">Unidade</p>
              <div class="form-group" style="margin-top: 10px;">
                <label class="form-label">Unidade / Filial *</label>
                ${units.length ? `
                  <select id="terminal-unit-select" class="form-select">
                    <option value="">Selecionar unidade...</option>
                    ${unitOptions}
                  </select>
                ` : `
                  <div class="notice-box" style="border-color: #fde68a; background: #fffbeb; color: #92400e;">
                    <span>Nenhuma unidade registada. Crie primeiro via <code>POST /api/v1/units</code>.</span>
                  </div>
                `}
              </div>
            </div>
            <div class="form-section">
              <p class="form-section-title">Dados do Terminal</p>
              <div class="form-group" style="margin-top: 10px;">
                <label class="form-label">Nome *</label>
                <input type="text" id="terminal-name" class="form-input" placeholder="Ex: Catraca Principal - Entrada 01" />
              </div>
              <div class="form-grid-2" style="margin-top: 10px;">
                <div class="form-group">
                  <label class="form-label">Nº Série *</label>
                  <input type="text" id="terminal-serial" class="form-input font-mono" placeholder="Ex: CKN92140023" />
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo *</label>
                  <select id="terminal-type" class="form-select">
                    <option value="ENTRY">Entrada</option>
                    <option value="EXIT">Saída</option>
                  </select>
                </div>
              </div>
              <div class="form-grid-2" style="margin-top: 10px;">
                <div class="form-group">
                  <label class="form-label">Modelo</label>
                  <input type="text" id="terminal-model" class="form-input" placeholder="Ex: SpeedFace V5L" />
                </div>
                <div class="form-group">
                  <label class="form-label">Porta</label>
                  <input type="number" id="terminal-port" class="form-input font-mono" value="4370" />
                </div>
              </div>
              <div class="form-group" style="margin-top: 10px;">
                <label class="form-label">Endereço IP</label>
                <input type="text" id="terminal-ip" class="form-input font-mono" placeholder="192.168.1.201" />
              </div>
            </div>
          </div>
        `,
        footerHtml: `
          <button class="btn btn-sm btn-outline" onclick="UI.closeDrawer()">Cancelar</button>
          <button class="btn btn-sm btn-primary" id="terminal-submit-btn" onclick="Pages.submitTerminal()">
            Registar terminal
          </button>
        `
      });
    }).catch(() => {
      UI.showToast('Não foi possível carregar as unidades.', 'error');
    });
  }

  async function submitTerminal() {
    const unitId = document.getElementById('terminal-unit-select')?.value;
    const name = document.getElementById('terminal-name')?.value.trim();
    const serialNumber = document.getElementById('terminal-serial')?.value.trim();
    const type = document.getElementById('terminal-type')?.value;
    const model = document.getElementById('terminal-model')?.value.trim();
    const ipAddress = document.getElementById('terminal-ip')?.value.trim();
    const port = parseInt(document.getElementById('terminal-port')?.value, 10);

    if (!unitId) return UI.showToast('Selecione a unidade.', 'error');
    if (!name) return UI.showToast('Introduza o nome do terminal.', 'error');
    if (!serialNumber) return UI.showToast('Introduza o número de série.', 'error');

    const btn = document.getElementById('terminal-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'A registar...'; }

    try {
      await API.terminals.create({
        unitId,
        name,
        serialNumber,
        type,
        ...(model ? { model } : {}),
        ...(ipAddress ? { ipAddress } : {}),
        ...(port && port > 0 ? { port } : {}),
      });
      UI.closeDrawer();
      UI.showToast('Terminal registado com sucesso', 'success');
      if (typeof updateTerminalsPill === 'function') updateTerminalsPill();
      setTimeout(() => Router.navigate('#/terminais'), 400);
    } catch (error) {
      if (btn) { btn.disabled = false; btn.textContent = 'Registar terminal'; }
      UI.showToast(error.message || 'Falha ao registar terminal.', 'error');
    }
  }

  // ─── 10. Access Events (Histórico de Acessos) ───────────────────────────

  async function renderAccessEvents() {
    let events = [];
    let units = [];
    try {
      [events, units] = await Promise.all([API.accessEvents.list({ limit: 50 }), API.units.list()]);
    } catch { /* toast */ }

    const unitMap = Object.fromEntries(units.map(u => [u.id, u]));
    const columns = ['Data/Hora', 'Cliente', 'Terminal', 'Tipo', 'Resultado', 'Razão', 'Fonte'];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Histórico de Acessos',
          'Registo completo de entradas e saídas'
        )}

        <div class="filter-bar" id="access-events-filter-bar">
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <div>
              <select class="form-select" id="access-filter-type">
                <option value="">Todos os tipos</option>
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Saída</option>
              </select>
            </div>
            <div>
              <input type="date" class="form-input" id="access-filter-from" style="width: 150px;" />
            </div>
            <div>
              <input type="date" class="form-input" id="access-filter-to" style="width: 150px;" />
            </div>
            <button class="btn btn-sm btn-outline" onclick="Pages.filterAccessEvents()">
              ${Icons.get('filter', 13)} Filtrar
            </button>
            <button class="btn btn-sm btn-ghost" onclick="Pages.clearAccessFilters()">
              ${Icons.get('x', 13)} Limpar
            </button>
          </div>
        </div>

        <div class="card card-no-padding">
          <div style="padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
            <p style="font-size: 12px; color: var(--muted-foreground);">Eventos — <strong id="access-count-label">${events.length}</strong> registos</p>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${columns.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody id="access-events-table-body">
                ${renderAccessRows(events, unitMap, columns.length)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function renderAccessRows(events, unitMap, colCount) {
    if (!events.length) {
      return `<tr><td colspan="${colCount}">${renderEmptyState('clock', 'Sem eventos de acesso', 'Os registos de entrada/saída aparecerão aqui')}</td></tr>`;
    }
    return events.map(e => `
      <tr>
        <td style="font-size: 12px; white-space: nowrap;">${formatDateTime(e.occurredAt)}</td>
        <td style="font-size: 12px;">${e.client ? escapeHtml(e.client.fullName) : `<span style="color: var(--muted-foreground);">—</span>`}</td>
        <td style="font-size: 12px;">${e.terminal ? escapeHtml(e.terminal.name) : `<span style="color: var(--muted-foreground);">—</span>`}</td>
        <td>
          <span class="badge ${e.type === 'ENTRY' ? 'badge-paid' : 'badge-pending'}">
            <span class="badge-dot"></span> ${statusLabel(e.type)}
          </span>
        </td>
        <td>
          <span class="badge ${statusBadgeClass(e.result)}">
            <span class="badge-dot"></span> ${statusLabel(e.result)}
          </span>
        </td>
        <td style="font-size: 12px; color: var(--muted-foreground); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(e.reason || '—')}</td>
        <td style="font-size: 12px;">${escapeHtml(e.source || '—')}</td>
      </tr>
    `).join('');
  }

  async function filterAccessEvents() {
    const type = document.getElementById('access-filter-type')?.value;
    const from = document.getElementById('access-filter-from')?.value;
    const to = document.getElementById('access-filter-to')?.value;
    const body = document.getElementById('access-events-table-body');
    const countLabel = document.getElementById('access-count-label');
    if (!body) return;

    body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px;"><div style="width:28px; height:28px; border:3px solid var(--primary-muted); border-top-color:var(--primary); border-radius:50%; animation:spinner-rotate 0.7s linear infinite; margin:0 auto;"></div></td></tr>`;

    const params = {};
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to + 'T23:59:59').toISOString();

    try {
      let events = await API.accessEvents.list(params);
      if (type) events = events.filter(e => e.type === type);
      let unitMap = {};
      try { const units = await API.units.list(); unitMap = Object.fromEntries(units.map(u => [u.id, u])); } catch { /* ignore */ }
      body.innerHTML = renderAccessRows(events, unitMap, 7);
      if (countLabel) countLabel.textContent = events.length;
    } catch {
      body.innerHTML = `<tr><td colspan="7">${renderEmptyState('alert-circle', 'Erro ao carregar acessos', '', '<button class="btn btn-sm btn-outline" onclick="Pages.filterAccessEvents()">Tentar de novo</button>')}</td></tr>`;
    }
  }

  async function clearAccessFilters() {
    const typeEl = document.getElementById('access-filter-type');
    const fromEl = document.getElementById('access-filter-from');
    const toEl = document.getElementById('access-filter-to');
    if (typeEl) typeEl.value = '';
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';
    await filterAccessEvents();
  }

  // ─── 11. Freezes (Congelamentos) ─────────────────────────────────────────

  function renderFreezes() {
    const columns = ['Cliente', 'Plano', 'Data Início', 'Data Fim', 'Motivo', 'Estado', 'Ações'];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Congelamentos',
          'Gestão de mensalidades suspensas',
          `
            <button class="btn btn-sm btn-primary" onclick="Pages.openFreezeDrawer()">
              ${Icons.get('plus', 14)} Novo congelamento
            </button>
          `
        )}

        ${renderNoticeBox(
          'Listagem indisponível',
          'A listagem de congelamentos requer o endpoint <code>GET /api/v1/freezes</code>, que não está disponível no backend atual. Pode criar novos congelamentos abaixo.'
        )}

        <div class="card card-no-padding">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${columns.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="${columns.length}">
                    ${renderEmptyState(
                      'snowflake',
                      'Sem dados de congelamentos',
                      'A listagem requer GET /api/v1/freezes (não disponível no backend).',
                      `<button class="btn btn-sm btn-primary" onclick="Pages.openFreezeDrawer()">${Icons.get('plus', 13)} Novo congelamento</button>`
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ─── 12. Arrears (Pendências e Atrasos) ──────────────────────────────────

  async function renderArrears() {
    const data = await loadDashboardData();
    const financialByStatus = (status) => {
      return data?.financial?.find(f => f.financialStatus === status) || { _sum: { amountDue: 0, amountPaid: 0, amountOpen: 0 } };
    };
    const pendingOpen = Number(financialByStatus('PENDING')._sum.amountOpen || 0);
    const overdueOpen = Number(financialByStatus('OVERDUE')._sum.amountOpen || 0);
    const totalOpen = pendingOpen + overdueOpen;

    const rows = [
      { label: 'Pendentes (dentro do prazo)', value: pendingOpen, status: 'PENDING' },
      { label: 'Em atraso', value: overdueOpen, status: 'OVERDUE' },
    ].filter(r => r.value > 0).map(r => `
      <tr>
        <td style="font-weight: 500; color: var(--foreground);">${r.label}</td>
        <td class="font-mono">${formatMoney(r.value)}</td>
        <td><span class="badge ${statusBadgeClass(r.status)}"><span class="badge-dot"></span> ${statusLabel(r.status)}</span></td>
        <td style="font-size: 12px; color: var(--muted-foreground);">Período atual</td>
      </tr>
    `).join('');

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader('Pendências e Atrasos', 'Clientes com mensalidades em atraso')}

        <div class="risk-cards-grid">
          <div class="risk-card risk-card-1m">
            <p style="font-size: 11px; text-transform: uppercase; color: var(--muted-foreground);">Pendentes</p>
            <p class="font-mono" style="font-size: 20px; font-weight: 600; margin-top: 6px;">${formatMoney(pendingOpen)}</p>
            <p style="font-size: 11px; color: var(--muted-foreground); margin-top: 2px;">em aberto</p>
          </div>
          <div class="risk-card risk-card-3m">
            <p style="font-size: 11px; text-transform: uppercase; color: var(--muted-foreground);">Em Atraso</p>
            <p class="font-mono" style="font-size: 20px; font-weight: 600; margin-top: 6px; color: var(--danger);">${formatMoney(overdueOpen)}</p>
            <p style="font-size: 11px; color: var(--muted-foreground); margin-top: 2px;">em aberto</p>
          </div>
          <div class="risk-card risk-card-6m">
            <p style="font-size: 11px; text-transform: uppercase; color: var(--muted-foreground);">Total em Aberto</p>
            <p class="font-mono" style="font-size: 20px; font-weight: 600; margin-top: 6px; color: var(--status-pending);">${formatMoney(totalOpen)}</p>
            <p style="font-size: 11px; color: var(--muted-foreground); margin-top: 2px;">pendente + atraso</p>
          </div>
        </div>

        ${totalOpen > 0
          ? `<div class="alert-banner alert-banner-warning">${Icons.get('alert-triangle', 18)}<span>Existem valores em aberto no valor total de ${formatMoney(totalOpen)}.</span></div>`
          : `<div class="alert-banner alert-banner-warning">${Icons.get('alert-triangle', 18)}<span>Ainda não existem valores em aberto. Todos os clientes estão em dia.</span></div>`
        }

        <div class="card card-no-padding">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Valor em Aberto</th>
                  <th>Estado</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `
                  <tr>
                    <td colspan="4">
                      ${renderEmptyState('alert-triangle', 'Sem valores em aberto', 'Todos os clientes estão em dia com os seus pagamentos')}
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ─── 13. Inactive Clients ─────────────────────────────────────────────────

  async function renderInactiveClients() {
    const columns = ['Cliente', 'Nº Cliente', 'Telefone', 'Estado', 'Desativado em', 'Ações'];
    let clients = [];
    try {
      clients = await fetchAllClients('DEACTIVATED');
    } catch { /* toast */ }

    const rows = clients.map(client => `
      <tr class="hoverable" onclick="window.location.hash = '#/clientes/${client.id}'">
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--muted); color: var(--muted-foreground); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">
              ${getInitials(client.fullName)}
            </div>
            <p style="font-weight: 500; color: var(--foreground);">${escapeHtml(client.fullName)}</p>
          </div>
        </td>
        <td><span class="font-mono" style="font-size: 12px;">${escapeHtml(client.clientNumber)}</span></td>
        <td>${escapeHtml(client.phone || '—')}</td>
        <td>
          <span class="badge badge-inactive"><span class="badge-dot"></span> ${statusLabel(client.status)}</span>
        </td>
        <td style="font-size: 13px; color: var(--secondary-foreground);">${formatDateTime(client.deactivatedAt)}</td>
        <td><a href="#/clientes/${client.id}" class="btn btn-icon-sm btn-ghost" title="Ver perfil">${Icons.get('eye', 14)}</a></td>
      </tr>
    `).join('');

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader('Clientes Desativados', 'Clientes que saíram ou foram desativados')}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          ${renderStatCard('Total Desativados', 'user-x', clients.length, '#94a3b8', '#f8fafc')}
        </div>

        <div class="card card-no-padding">
          <div style="padding: 10px 16px; border-bottom: 1px solid var(--border);">
            <p style="font-size: 12px; color: var(--muted-foreground);">Clientes desativados — <strong>${clients.length}</strong> registos</p>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${columns.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows || `
                  <tr>
                    <td colspan="${columns.length}">
                      ${renderEmptyState('user-x', 'Nenhum cliente desativado', 'Os clientes desativados aparecerão aqui')}
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ─── 14. Reports (Reais) ─────────────────────────────────────────────────

  async function renderReports() {
    const daysLabel = _reportsDays ? `${_reportsDays} dias` : 'Todos os dados';
    const statCards = await renderReportsContent(_reportsCategory, _reportsDays);
    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Relatórios',
          'Análise detalhada por categoria',
          `
            <div id="reports-export-btn" style="display: none;">
              <button class="btn btn-sm btn-outline" onclick="Pages.exportCurrentReport()">
                ${Icons.get('download', 13)} Exportar CSV
              </button>
            </div>
          `
        )}

        <div class="subpage-layout">
          <div class="subpage-sidebar">
            <div class="subpage-nav-card" id="reports-sidebar-nav">
              <button class="subpage-nav-item active" data-report="clientes">${Icons.get('users', 16)}<span>Clientes</span></button>
              <button class="subpage-nav-item" data-report="pagamentos">${Icons.get('credit-card', 16)}<span>Pagamentos</span></button>
              <button class="subpage-nav-item" data-report="faturacao">${Icons.get('trending-up', 16)}<span>Faturação</span></button>
              <button class="subpage-nav-item" data-report="acessos">${Icons.get('clock', 16)}<span>Acessos</span></button>
            </div>
          </div>

          <div class="subpage-content">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <h2 style="font-size: 16px; font-weight: 600; font-family: var(--font-heading);" id="reports-title">Relatório de Clientes</h2>
                <p style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;" id="reports-period-label">${daysLabel}</p>
              </div>
              <div style="display: flex; gap: 4px;" id="reports-period-btns">
                <button class="btn btn-sm ${!_reportsDays ? 'btn-primary' : 'btn-ghost'}" data-days="">Todos</button>
                <button class="btn btn-sm ${_reportsDays === 30 ? 'btn-primary' : 'btn-ghost'}" data-days="30">30d</button>
                <button class="btn btn-sm ${_reportsDays === 90 ? 'btn-primary' : 'btn-ghost'}" data-days="90">90d</button>
                <button class="btn btn-sm ${_reportsDays === 365 ? 'btn-primary' : 'btn-ghost'}" data-days="365">1a</button>
              </div>
            </div>

            <div id="reports-content-area">
              ${statCards}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function renderReportsContent(category, days) {
    try {
      if (category === 'clientes') return await renderReportsClientes(days);
      if (category === 'pagamentos') return await renderReportsPagamentos(days);
      if (category === 'faturacao') return await renderReportsFaturacao();
      if (category === 'acessos') return await renderReportsAcessos(days);
    } catch {
      return renderEmptyState('alert-circle', 'Erro ao carregar relatório', '', `<button class="btn btn-sm btn-outline" onclick="Pages.switchReport('${category}')">Tentar de novo</button>`);
    }
    return renderEmptyState('bar-chart-2', 'Selecione uma categoria');
  }

  async function renderReportsClientes(days) {
    const clients = await fetchAllClients();
    const activeCount = clients.filter(c => c.status === 'ACTIVE').length;
    const inactiveCount = clients.filter(c => c.status === 'INACTIVE').length;
    const deactivatedCount = clients.filter(c => c.status === 'DEACTIVATED').length;
    const frozenCount = clients.filter(c => c.status === 'FROZEN').length;
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        ${renderStatCard('Total clientes', 'users', clients.length, '#0f172a', '#f1f5f9')}
        ${renderStatCard('Ativos', 'users', activeCount, '#16a34a', '#f0fdf4')}
        ${renderStatCard('Inativos', 'users', inactiveCount, '#94a3b8', '#f8fafc')}
        ${renderStatCard('Congelados', 'users', frozenCount, '#0ea5e9', '#f0f9ff')}
        ${renderStatCard('Desativados', 'users', deactivatedCount, '#dc2626', '#fef2f2')}
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Todos os clientes</h3>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead><tr><th>Nome</th><th>Nº</th><th>Estado</th><th>Criado em</th></tr></thead>
            <tbody>
              ${clients.slice(0, 20).map(c => `
                <tr><td style="font-weight:500;">${escapeHtml(c.fullName)}</td><td class="font-mono" style="font-size:12px;">${escapeHtml(c.clientNumber)}</td><td><span class="badge ${statusBadgeClass(c.status)}"><span class="badge-dot"></span> ${statusLabel(c.status)}</span></td><td style="font-size:12px;">${formatDate(c.createdAt)}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function renderReportsPagamentos(days) {
    const data = await loadDashboardData();
    const totalPaid = (data?.financial || []).filter(f => f.financialStatus === 'PAID').reduce((a, f) => a + Number(f._sum.amountPaid || 0), 0);
    const totalOpen = (data?.financial || []).reduce((a, f) => a + Number(f._sum.amountOpen || 0), 0);

    let payments = [];
    try {
      const range = days ? { from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() } : {};
      payments = (await API.payments.list({ ...range, limit: 300 })) || [];
    } catch { /* toast */ }
    const periodTotal = payments.reduce((a, p) => a + Number(p.amount || 0), 0);
    const methodsTotal = {};
    payments.forEach(p => { methodsTotal[p.method] = (methodsTotal[p.method] || 0) + Number(p.amount || 0); });
    const methodRows = Object.entries(methodsTotal).map(([method, total]) => `
      <tr>
        <td>${statusLabel(method)}</td>
        <td class="font-mono">${formatMoney(total)}</td>
      </tr>
    `).join('');

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        ${renderStatCard('Total pago', 'check-circle', formatMoney(totalPaid), '#16a34a', '#f0fdf4')}
        ${renderStatCard('Total em aberto', 'clock', formatMoney(totalOpen), '#d97706', '#fffbeb')}
        ${renderStatCard(`Recebido${days ? ` (${days}d)` : ''}`, 'credit-card', formatMoney(periodTotal), '#0f172a', '#f1f5f9')}
        ${renderStatCard('Pagamentos', 'list', payments.length, '#0ea5e9', '#f0f9ff')}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Total por método</h3></div>
          <div class="table-wrapper">
            <table class="table">
              <thead><tr><th>Método</th><th>Total</th></tr></thead>
              <tbody>
                ${methodRows || `<tr><td colspan="2">${renderEmptyState('credit-card', 'Sem pagamentos no período')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">Pagamentos por estado</h3></div>
          <div class="table-wrapper">
            <table class="table">
              <thead><tr><th>Estado</th><th>Faturado</th><th>Pago</th><th>Em aberto</th></tr></thead>
              <tbody>
                ${(data?.financial || []).map(f => `
                  <tr><td><span class="badge ${statusBadgeClass(f.financialStatus)}"><span class="badge-dot"></span> ${statusLabel(f.financialStatus)}</span></td><td class="font-mono">${formatMoney(f._sum.amountDue || 0)}</td><td class="font-mono">${formatMoney(f._sum.amountPaid || 0)}</td><td class="font-mono">${formatMoney(f._sum.amountOpen || 0)}</td></tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Pagamentos registados${days ? ` (últimos ${days} dias)` : ''}</h3>
          <p style="margin-left:auto;font-size:12px;color:var(--muted-foreground);">Total: <strong>${formatMoney(periodTotal)}</strong> — ${payments.length} registos</p>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead><tr><th>Data</th><th>Cliente</th><th>Método</th><th>Valor</th><th>Referência</th><th>Estado</th></tr></thead>
            <tbody>
              ${payments.length ? payments.map(p => `
                <tr>
                  <td style="font-size:12px;white-space:nowrap;">${formatDateTime(p.paidAt)}</td>
                  <td>
                    <a href="#/clientes/${encodeURIComponent(p.clientId)}" style="font-weight:500;color:var(--foreground);text-decoration:none;">${escapeHtml(p.client?.fullName || '—')}</a>
                    <span class="font-mono" style="display:block;font-size:11px;color:var(--muted-foreground);">${escapeHtml(p.client?.clientNumber || '')}</span>
                  </td>
                  <td>${statusLabel(p.method)}</td>
                  <td class="font-mono">${formatMoney(p.amount)}</td>
                  <td style="font-size:12px;">${escapeHtml(p.reference || '—')}</td>
                  <td><span class="badge ${statusBadgeClass(p.status)}"><span class="badge-dot"></span> ${statusLabel(p.status)}</span></td>
                </tr>
              `).join('') : `
                <tr><td colspan="6">${renderEmptyState('credit-card', 'Sem pagamentos no período')}</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function renderReportsFaturacao() {
    const data = await loadDashboardData();
    const totalDue = (data?.financial || []).reduce((a, f) => a + Number(f._sum.amountDue || 0), 0);
    const receivedYear = Number(data?.receivedYear || 0);
    const pendingOpen = (data?.financial || []).filter(f => f.financialStatus === 'PENDING').reduce((a, f) => a + Number(f._sum.amountOpen || 0), 0);
    const overdueOpen = (data?.financial || []).filter(f => f.financialStatus === 'OVERDUE').reduce((a, f) => a + Number(f._sum.amountOpen || 0), 0);
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        ${renderStatCard('Total faturado', 'dollar-sign', formatMoney(totalDue), '#0f172a', '#f1f5f9')}
        ${renderStatCard('Recebido', 'trending-up', formatMoney(receivedYear), '#16a34a', '#f0fdf4')}
        ${renderStatCard('Pendente', 'clock', formatMoney(pendingOpen), '#d97706', '#fffbeb')}
        ${renderStatCard('Em atraso', 'alert-triangle', formatMoney(overdueOpen), '#dc2626', '#fef2f2')}
      </div>
    `;
  }

  async function renderReportsAcessos(days) {
    const from = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : undefined;
    const events = await API.accessEvents.list({ ...(from ? { from } : {}), limit: 200 });
    const entryCount = events.filter(e => e.type === 'ENTRY' && e.result === 'AUTHORIZED').length;
    const deniedCount = events.filter(e => e.result === 'DENIED').length;
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        ${renderStatCard('Total eventos', 'clock', events.length, '#0f172a', '#f1f5f9')}
        ${renderStatCard('Entradas autorizadas', 'log-in', entryCount, '#16a34a', '#f0fdf4')}
        ${renderStatCard('Acessos negados', 'lock', deniedCount, '#dc2626', '#fef2f2')}
      </div>
      <div class="card">
        <div class="card-header"><h3 class="card-title">Eventos recentes</h3></div>
        <div class="table-wrapper">
          <table class="table">
            <thead><tr><th>Data</th><th>Cliente</th><th>Tipo</th><th>Resultado</th><th>Razão</th></tr></thead>
            <tbody>
              ${events.slice(0, 20).map(e => `
                <tr><td style="font-size:12px; white-space:nowrap;">${formatDateTime(e.occurredAt)}</td><td style="font-size:12px;">${e.client ? escapeHtml(e.client.fullName) : '—'}</td><td><span class="badge ${e.type === 'ENTRY' ? 'badge-paid' : 'badge-pending'}"><span class="badge-dot"></span> ${statusLabel(e.type)}</span></td><td><span class="badge ${statusBadgeClass(e.result)}"><span class="badge-dot"></span> ${statusLabel(e.result)}</span></td><td style="font-size:12px; color:var(--muted-foreground);">${escapeHtml(e.reason || '—')}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function bindReportsTabs() {
    const nav = document.getElementById('reports-sidebar-nav');
    const periodBtns = document.getElementById('reports-period-btns');
    const exportBtnWrap = document.getElementById('reports-export-btn');
    if (exportBtnWrap) exportBtnWrap.style.display = (_reportsCategory === 'acessos' || _reportsCategory === 'clientes' || _reportsCategory === 'pagamentos') ? 'block' : 'none';

    if (nav) {
      nav.querySelectorAll('.subpage-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const cat = btn.getAttribute('data-report');
          if (cat === _reportsCategory) return;
          _reportsCategory = cat;
          nav.querySelectorAll('.subpage-nav-item').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          refreshReports();
        });
      });
    }

    if (periodBtns) {
      periodBtns.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const daysStr = btn.getAttribute('data-days');
          _reportsDays = daysStr ? parseInt(daysStr, 10) : null;
          refreshReports();
        });
      });
    }
  }

  async function refreshReports() {
    const title = document.getElementById('reports-title');
    const periodLabel = document.getElementById('reports-period-label');
    const area = document.getElementById('reports-content-area');
    const exportBtnWrap = document.getElementById('reports-export-btn');
    const periodBtns = document.getElementById('reports-period-btns');
    const nav = document.getElementById('reports-sidebar-nav');

    const titles = { clientes: 'Relatório de Clientes', pagamentos: 'Relatório de Pagamentos', faturacao: 'Relatório de Faturação', acessos: 'Relatório de Acessos' };
    if (title) title.textContent = titles[_reportsCategory] || 'Relatório';
    if (periodLabel) periodLabel.textContent = _reportsDays ? `Últimos ${_reportsDays} dias` : 'Todos os dados';
    if (exportBtnWrap) exportBtnWrap.style.display = (_reportsCategory === 'acessos' || _reportsCategory === 'clientes' || _reportsCategory === 'pagamentos') ? 'block' : 'none';

    if (periodBtns) {
      periodBtns.querySelectorAll('button').forEach(b => {
        const d = b.getAttribute('data-days');
        const val = d ? parseInt(d, 10) : null;
        b.className = `btn btn-sm ${val === _reportsDays ? 'btn-primary' : 'btn-ghost'}`;
      });
    }

    if (nav) {
      nav.querySelectorAll('.subpage-nav-item').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-report') === _reportsCategory);
      });
    }

    if (!area) return;
    area.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:32px;"><div style="width:28px;height:28px;border:3px solid var(--primary-muted);border-top-color:var(--primary);border-radius:50%;animation:spinner-rotate 0.7s linear infinite;"></div></div>`;
    try {
      area.innerHTML = await renderReportsContent(_reportsCategory, _reportsDays);
    } catch {
      area.innerHTML = renderEmptyState('alert-circle', 'Erro ao carregar relatório');
    }
  }

  function switchReport(cat) {
    _reportsCategory = cat;
    refreshReports();
  }

  async function exportCurrentReport() {
    if (_reportsCategory === 'clientes') {
      const clients = await fetchAllClients();
      localCsv(clients.map(c => ({
        nome: c.fullName, numero: c.clientNumber, email: c.email, telefone: c.phone,
        estado: c.status, criado: c.createdAt, nascimento: c.birthDate, nif: c.taxId,
        genero: c.gender, online: c.online ? 'Sim' : 'Não'
      })), 'clientes.csv');
    } else if (_reportsCategory === 'pagamentos') {
      const range = _reportsDays ? { from: new Date(Date.now() - _reportsDays * 24 * 60 * 60 * 1000).toISOString() } : {};
      const payments = (await API.payments.list({ ...range, limit: 300 })) || [];
      localCsv(payments.map(p => ({
        data: p.paidAt,
        cliente: p.client?.fullName || '',
        numeroCliente: p.client?.clientNumber || '',
        metodo: statusLabel(p.method),
        valor: p.amount,
        referencia: p.reference || '',
        estado: statusLabel(p.status)
      })), 'relatorio-pagamentos.csv');
    } else if (_reportsCategory === 'acessos') {
      const events = await API.accessEvents.list({ limit: 500 });
      localCsv(events.map(e => ({
        data: e.occurredAt, cliente: e.client?.fullName || '',
        terminal: e.terminal?.name || '', tipo: e.type, resultado: e.result,
        razao: e.reason, fonte: e.source
      })), 'acessos.csv');
    }
  }

  // ─── 15. Audit ────────────────────────────────────────────────────────────

  function renderAudit() {
    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Histórico e Auditoria',
          'Registo completo de todas as ações realizadas no sistema'
        )}

        ${renderNoticeBox(
          'Endpoint necessário',
          'A listagem de eventos de auditoria requer o endpoint <code>GET /api/v1/audit-events</code>, que não está disponível no backend atual. O backend regista eventos de auditoria internamente (criação de subscrição, pagamentos, congelamentos, etc.) mas não dispõe de um endpoint público de leitura.'
        )}

        <div class="card">
          ${renderEmptyState('clock', 'Sem eventos de auditoria', 'Os eventos de auditoria serão listados aqui quando o endpoint estiver disponível.')}
        </div>
      </div>
    `;
  }

  // ─── 16. Integrations / OVG ──────────────────────────────────────────────

  function renderIntegrations() {
    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader('OVG', 'Integração com o sistema OVG')}

        ${renderNoticeBox(
          'Endpoints necessários',
          'A integração OVG requer endpoints que não estão disponíveis no backend atual: <code>GET /api/v1/integrations/ovg/status</code> e <code>POST /api/v1/integrations/ovg/sync</code>.'
        )}

        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="integration-card">
            <div class="integration-top">
              <div class="integration-logo-wrap">
                <div class="integration-logo-box">
                  <span style="font-size: 16px; font-weight: 700; color: #0369a1; font-family: var(--font-heading);">OVG</span>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 style="font-size: 14px; font-weight: 600; font-family: var(--font-heading);">OVG</h3>
                    <span class="badge badge-overdue"><span class="badge-dot"></span> Indisponível</span>
                  </div>
                  <p style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Sistema de gestão e operações da organização</p>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3 class="card-title">Estado da Integração</h3></div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
              <div class="info-box">
                <p class="info-label">Estado</p>
                <p class="info-value"><span class="badge badge-overdue"><span class="badge-dot"></span> Indisponível</span></p>
              </div>
              <div class="info-box">
                <p class="info-label">Última sincronização</p>
                <p class="info-value">—</p>
              </div>
              <div class="info-box">
                <p class="info-label">Clientes sincronizados</p>
                <p class="info-value font-mono">—</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── 17. Settings (Definições) ────────────────────────────────────────────

  function renderSettings() {
    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader('Definições', 'Configuração do sistema')}

        ${renderNoticeBox(
          'Preferências locais',
          'Estas definições são guardadas apenas neste navegador. O backend não dispõe de endpoint para guardar definições do sistema.'
        )}

        <div class="subpage-layout">
          <div class="subpage-sidebar">
            <div class="subpage-nav-card">
              <button class="subpage-nav-item active">${Icons.get('settings', 15)}<span>Geral</span></button>
            </div>
          </div>

          <div class="subpage-content">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Preferências Locais</h3>
                <p class="card-subtitle">Configurações guardadas neste navegador</p>
              </div>

              <div class="form-section">
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
                  <div class="toggle-row">
                    <div>
                      <p class="toggle-row-label">Confirmação antes de desativar</p>
                      <p class="toggle-row-desc">Mostrar diálogo de confirmação antes de desativar clientes</p>
                    </div>
                    <button class="toggle-switch active"><span class="toggle-handle"></span></button>
                  </div>
                  <div class="toggle-row">
                    <div>
                      <p class="toggle-row-label">Modo compacto</p>
                      <p class="toggle-row-desc">Reduzir espaçamento nas tabelas</p>
                    </div>
                    <button class="toggle-switch"><span class="toggle-handle"></span></button>
                  </div>
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
                <button class="btn btn-sm btn-outline" onclick="UI.showToast('Preferências guardadas neste navegador')">
                  ${Icons.get('save', 13)} Guardar localmente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Drawers & Actions ───────────────────────────────────────────────────

  function openPaymentDrawer(clientId = '') {
    fetchAllClients()
      .then(clients => {
        const options = (clients || []).map(c => `<option value="${c.id}">${escapeHtml(c.fullName)} (${escapeHtml(c.clientNumber)})</option>`).join('');
        UI.openDrawer({
          title: 'Registar Pagamento',
          subtitle: 'Preencha os dados do pagamento',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div class="form-section">
                <p class="form-section-title">Cliente</p>
                <div class="form-group" style="margin-top: 10px;">
                  <label class="form-label">Cliente *</label>
                  <select id="payment-client-select" class="form-select">
                    <option value="">Selecionar cliente...</option>
                    ${options}
                  </select>
                </div>
              </div>
              <div class="form-section">
                <p class="form-section-title">Pagamento</p>
                <div class="form-grid-2" style="margin-top: 10px;">
                  <div class="form-group">
                    <label class="form-label">Valor (AOA) *</label>
                    <input type="number" step="0.01" min="0.01" id="payment-amount-input" class="form-input" placeholder="0,00" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Data do pagamento *</label>
                    <input type="datetime-local" id="payment-date-input" class="form-input" />
                  </div>
                </div>
                <div class="form-group" style="margin-top: 10px;">
                  <label class="form-label">Método de pagamento *</label>
                  <select id="payment-method-select" class="form-select">
                    <option value="CASH">Numerário</option>
                    <option value="TRANSFER">Transferência</option>
                    <option value="CARD">Cartão</option>
                    <option value="MOBILE_MONEY">Dinheiro Móvel</option>
                    <option value="MULTICAIXA">Multicaixa</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
                <div class="form-group" style="margin-top: 10px;">
                  <label class="form-label">Referência (opcional)</label>
                  <input type="text" id="payment-reference-input" class="form-input" placeholder="Referência externa..." />
                </div>
              </div>
            </div>
          `,
          footerHtml: `
            <button class="btn btn-sm btn-outline" onclick="UI.closeDrawer()">Cancelar</button>
            <button class="btn btn-sm btn-primary" id="payment-submit-btn" onclick="Pages.submitPayment()">
              Registar pagamento
            </button>
          `
        });
        if (clientId) {
          const select = document.getElementById('payment-client-select');
          if (select) select.value = clientId;
        }
      })
      .catch(() => {
        UI.showToast('Não foi possível carregar os clientes.', 'error');
      });
  }

  async function submitPayment() {
    const clientId = document.getElementById('payment-client-select')?.value;
    const amount = parseFloat(String(document.getElementById('payment-amount-input')?.value || '').replace(',', '.'));
    const paidAtRaw = document.getElementById('payment-date-input')?.value;
    const method = document.getElementById('payment-method-select')?.value;
    const reference = document.getElementById('payment-reference-input')?.value.trim();
    const paidAt = paidAtRaw ? new Date(paidAtRaw) : null;

    if (!clientId) return UI.showToast('Selecione um cliente.', 'error');
    if (!amount || isNaN(amount) || amount <= 0) return UI.showToast('Introduza um valor válido.', 'error');
    if (!paidAt || isNaN(paidAt.getTime())) return UI.showToast('Selecione a data e hora do pagamento.', 'error');

    const btn = document.getElementById('payment-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'A registar...'; }

    const randomId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      await API.payments.create({
        clientId,
        amount,
        paidAt: paidAt.toISOString(),
        method,
        ...(reference ? { reference } : {}),
        idempotencyKey: `fe-${randomId}`
      });
      UI.closeDrawer();
      UI.showToast('Pagamento registado com sucesso', 'success');
      setTimeout(() => Router.navigate('#/pagamentos'), 600);
    } catch (error) {
      if (btn) { btn.disabled = false; btn.textContent = 'Registar pagamento'; }
      UI.showToast(error.message || 'Falha ao registar pagamento.', 'error');
    }
  }

  function openFreezeDrawer() {
    fetchAllClients()
      .then(clients => {
        const activeClients = (clients || []).filter(c => c.status === 'ACTIVE' || c.status === 'FROZEN');
        const options = activeClients.map(c => `<option value="${c.id}">${escapeHtml(c.fullName)} (${escapeHtml(c.clientNumber)})</option>`).join('');

        UI.openDrawer({
          title: 'Novo Congelamento',
          subtitle: 'Suspender temporariamente a mensalidade de um cliente',
          contentHtml: `
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${renderNoticeBox(
                'Atenção',
                'O congelamento requer o ID da subscrição ativa do cliente. O backend não dispõe de endpoint para obter subscrições por cliente — pode ser necessário obter o subscriptionId por outra via.'
              )}
              <div class="form-section">
                <p class="form-section-title">Cliente</p>
                <div class="form-group" style="margin-top: 10px;">
                  <label class="form-label">Cliente *</label>
                  <select id="freeze-client-select" class="form-select">
                    <option value="">Selecionar cliente...</option>
                    ${options}
                  </select>
                </div>
              </div>
              <div class="form-section">
                <p class="form-section-title">Período do Congelamento</p>
                <div class="form-grid-2" style="margin-top: 10px;">
                  <div class="form-group">
                    <label class="form-label">Data de início *</label>
                    <input type="date" id="freeze-start-input" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Data de fim (opcional)</label>
                    <input type="date" id="freeze-end-input" class="form-input" />
                  </div>
                </div>
              </div>
              <div class="form-section">
                <p class="form-section-title">Motivo</p>
                <div class="form-group" style="margin-top: 10px;">
                  <select id="freeze-reason-select" class="form-select">
                    <option value="Motivos de saúde">Motivos de saúde</option>
                    <option value="Viagem">Viagem</option>
                    <option value="Motivos pessoais">Motivos pessoais</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div class="form-group" style="margin-top: 10px;">
                  <input type="text" id="freeze-reason-input" class="form-input" placeholder="Descreva o motivo (se 'Outro')..." />
                </div>
              </div>
            </div>
          `,
          footerHtml: `
            <button class="btn btn-sm btn-outline" onclick="UI.closeDrawer()">Cancelar</button>
            <button class="btn btn-sm btn-primary" id="freeze-submit-btn" onclick="Pages.submitFreeze()">
              Guardar congelamento
            </button>
          `
        });
      })
      .catch(() => {
        UI.showToast('Não foi possível carregar os clientes.', 'error');
      });
  }

  async function submitFreeze() {
    const clientId = document.getElementById('freeze-client-select')?.value;
    const startsOn = document.getElementById('freeze-start-input')?.value;
    const endsOn = document.getElementById('freeze-end-input')?.value;
    const reason = (document.getElementById('freeze-reason-input')?.value.trim()) ||
      document.getElementById('freeze-reason-select')?.value;

    if (!clientId) return UI.showToast('Selecione um cliente.', 'error');
    if (!startsOn) return UI.showToast('Selecione a data de início.', 'error');

    const btn = document.getElementById('freeze-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'A guardar...'; }

    try {
      UI.closeDrawer();
      UI.openModal({
        title: 'SubscriptionId necessário',
        subtitle: 'Congelamento de subscrição',
        contentHtml: renderNoticeBox(
          'Endpoint necessário',
          'Para congelar é necessário o <code>subscriptionId</code>. O backend não dispõe de endpoint <code>GET /api/v1/clients/:id/subscription</code>. Contacte o administrador para obter o ID da subscrição ativa, ou utilize a API diretamente.'
        ),
        footerHtml: '<button class="btn btn-sm btn-primary" onclick="UI.closeModal()">Entendido</button>'
      });
    } catch (error) {
      if (btn) { btn.disabled = false; btn.textContent = 'Guardar congelamento'; }
      UI.showToast(error.message || 'Falha ao guardar congelamento.', 'error');
    }
  }

  function openRenewAccessDrawer(clientId, fullName, currentLimit, currentDebt) {
    const isUnlimited = currentLimit === -1;
    UI.openDrawer({
      title: 'Renovar Acesso',
      subtitle: `Renovar ciclo de acesso de ${fullName}`,
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="padding: 12px 16px; background: #f8fafc; border-radius: var(--radius-md); border: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <p style="font-size: 14px; font-weight: 600; color: var(--foreground);">${escapeHtml(fullName)}</p>
              <p style="font-size: 12px; color: var(--muted-foreground);">ID: ${clientId.slice(0, 8)}...</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 11px; color: var(--muted-foreground);">Limite Atual</p>
              <span class="badge badge-paid">${isUnlimited ? 'Ilimitado' : `${currentLimit} aulas`}</span>
            </div>
          </div>

          ${currentDebt > 0 ? `
            <div class="notice-box" style="border-color: #fde68a; background: #fffbeb; color: #92400e;">
              <span class="notice-icon">${Icons.get('alert-circle', 16)}</span>
              <div>
                <p><strong>Tolerância ativa</strong></p>
                <p style="margin-top:2px;">O utente utilizou ${currentDebt} acesso(s) extra de cortesia. Este valor será abatido automaticamente ao novo saldo.</p>
              </div>
            </div>
          ` : ''}

          <div class="form-group">
            <label class="form-label">Novo limite de entradas por ciclo</label>
            <select id="renew-limit-select" class="form-select">
              <option value="2">2 aulas</option>
              <option value="3">3 aulas</option>
              <option value="5">5 aulas</option>
              <option value="10" selected>10 aulas</option>
              <option value="15">15 aulas</option>
              <option value="20">20 aulas</option>
              <option value="-1">Ilimitado</option>
            </select>
          </div>

          <div style="padding: 12px 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: var(--radius-md); font-size: 12px; color: #0369a1;">
            <strong>Nota:</strong> Esta operação repõe o contador de entradas a 0 e inicia um novo ciclo de 30 dias.
          </div>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-sm btn-outline" onclick="UI.closeDrawer()">Cancelar</button>
        <button class="btn btn-sm btn-primary" id="renew-submit-btn" onclick="Pages.submitRenewAccess('${clientId}')">
          Confirmar renovação
        </button>
      `
    });
  }

  async function submitRenewAccess(clientId) {
    const select = document.getElementById('renew-limit-select');
    const newLimit = select ? parseInt(select.value, 10) : 10;
    const btn = document.getElementById('renew-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'A renovar...'; }

    try {
      await API.clients.renewAccess(clientId, newLimit);
      UI.closeDrawer();
      UI.showToast('Ciclo de acesso renovado com sucesso', 'success');
      setTimeout(() => Router.navigate('#/clientes/' + clientId), 600);
    } catch (error) {
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar renovação'; }
      UI.showToast(error.message || 'Falha ao renovar acesso.', 'error');
    }
  }

  function confirmDeactivateClient(clientId, name) {
    UI.openModal({
      title: 'Desativar cliente',
      subtitle: name,
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <p style="font-size: 13px; color: var(--foreground);">
            Tem a certeza que deseja desativar o cliente <strong>${escapeHtml(name)}</strong>?
          </p>
          <p style="font-size: 13px; color: var(--muted-foreground);">
            Esta ação irá alterar o estado do cliente para <strong>Desativado</strong> e encerrar todas as subscrições ativas.
          </p>
          <div class="notice-box" style="border-color: #fde68a; background: #fffbeb; color: #92400e;">
            <span class="notice-icon">${Icons.get('alert-circle', 16)}</span>
            <div>
              <p><strong>Esta ação não pode ser facilmente revertida.</strong></p>
              <p style="margin-top:2px;">O cliente perderá acesso ao ginásio até ser reativado.</p>
            </div>
          </div>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-sm btn-outline" onclick="UI.closeModal()">Cancelar</button>
        <button class="btn btn-sm" style="background-color: var(--danger); color: white;" id="confirm-deactivate-btn" onclick="Pages.executeDeactivateClient('${clientId}')">
          ${Icons.get('user-x', 13)} Desativar
        </button>
      `
    });
  }

  async function executeDeactivateClient(clientId) {
    const btn = document.getElementById('confirm-deactivate-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'A desativar...'; }
    try {
      await API.clients.deactivate(clientId);
      UI.closeModal();
      UI.showToast('Cliente desativado com sucesso', 'success');
      setTimeout(() => Router.navigate('#/clientes'), 600);
    } catch (error) {
      if (btn) { btn.disabled = false; btn.innerHTML = `${Icons.get('user-x', 13)} Desativar`; }
      UI.showToast(error.message || 'Falha ao desativar cliente.', 'error');
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    renderDashboard,
    renderClients,
    renderNewClient,
    renderClientProfile,
    renderProfileTabContent,
    renderPlans,
    openPlanDrawer,
    submitPlan,
    openPlanHistory,
    refreshPlansPage,
    renderPayments,
    renderBilling,
    renderAttendance,
    exportBillingExcel,
    bindAttendancePage,
    exportAttendanceExcel,
    exportAttendanceCsv,
    openEditClientDrawer,
    submitEditClient,
    renderTerminals,
    renderAccessEvents,
    renderFreezes,
    renderArrears,
    renderInactiveClients,
    renderReports,
    renderAudit,
    renderIntegrations,
    renderSettings,
openPaymentDrawer,
  submitPayment,
  bindPaymentsPage,
  resetPaymentsFilters,
  exportPaymentsCsv,
    openFreezeDrawer,
    submitFreeze,
    openRenewAccessDrawer,
    submitRenewAccess,
    openTerminalDrawer,
    submitTerminal,
    confirmDeactivateClient,
    executeDeactivateClient,
    submitNewClient,
    filterClientsTable,
    clearClientsFilters,
    bindClientsPage,
    bindDashboardPeriod,
    bindDashboardAutoRefresh,
    bindReportsTabs,
    switchReport,
    exportCurrentReport,
    filterAccessEvents,
    clearAccessFilters,
  };
})();

if (typeof window !== 'undefined') window.Pages = Pages;
if (typeof globalThis !== 'undefined') globalThis.Pages = Pages;
