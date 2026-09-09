/**
 * Solve Acess — Page Renderers in Pure Vanilla JavaScript
 * Generates semantic HTML matching exactly the original Figma UI design
 */

const Pages = (() => {

  // ─── Helper Functions ─────────────────────────────────────────────────────

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

  function renderStatCard(label, iconName, iconColor = 'var(--primary)', iconBg = '#f0fdf4', trend = '', trendUp = true) {
    return `
      <div class="stat-card">
        <div class="stat-card-top">
          <div>
            <p class="stat-card-label">${label}</p>
            <div class="skeleton" style="height: 24px; width: 64px; margin-top: 10px;"></div>
            ${trend ? `<p class="stat-card-trend ${trendUp ? 'up' : ''}">${trend}</p>` : ''}
          </div>
          <div class="stat-card-icon" style="background-color: ${iconBg}; color: ${iconColor};">
            ${Icons.get(iconName, 18)}
          </div>
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

  // ─── 1. Dashboard ─────────────────────────────────────────────────────────

  function renderDashboard() {
    const quickActions = [
      { label: 'Novo cliente', icon: 'plus', href: '#/clientes/novo' },
      { label: 'Registar pagamento', icon: 'credit-card', action: 'openPaymentDrawer' },
      { label: 'Ver atrasos', icon: 'alert-triangle', href: '#/pendencias' },
      { label: 'Relatórios', icon: 'trending-up', href: '#/relatorios' },
    ];

    const statusData = [
      { label: 'Pagos', color: '#16a34a' },
      { label: 'Pendentes', color: '#d97706' },
      { label: 'Atraso', color: '#dc2626' },
      { label: 'Congelados', color: '#0ea5e9' },
    ];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 24px;">
        ${renderSectionHeader(
          'Dashboard',
          'Visão geral do sistema',
          `
            <div style="display: flex; align-items: center; gap: 4px; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 2px; background: #ffffff;">
              <button class="btn btn-sm btn-primary" style="padding: 4px 10px;">Mês</button>
              <button class="btn btn-sm btn-ghost" style="padding: 4px 10px;">Semana</button>
              <button class="btn btn-sm btn-ghost" style="padding: 4px 10px;">Ano</button>
            </div>
          `
        )}

        <!-- 6 Quick Stats Grid -->
        <div class="stats-grid-6">
          ${renderStatCard('Clientes Ativos', 'users', '#16a34a', '#f0fdf4')}
          ${renderStatCard('Pagos', 'check-circle', '#16a34a', '#f0fdf4')}
          ${renderStatCard('Pendentes', 'clock', '#d97706', '#fffbeb')}
          ${renderStatCard('Em Atraso', 'alert-triangle', '#dc2626', '#fef2f2')}
          ${renderStatCard('Congelados', 'snowflake', '#0ea5e9', '#f0f9ff')}
          ${renderStatCard('Desativados', 'user-x', '#94a3b8', '#f8fafc')}
        </div>

        <!-- 4 Financial Stats Grid -->
        <div class="stats-grid-4">
          ${renderStatCard('Total Faturado', 'dollar-sign', '#16a34a', '#f0fdf4')}
          ${renderStatCard('Total Recebido', 'trending-up', '#16a34a', '#f0fdf4')}
          ${renderStatCard('Total Pendente', 'clock', '#d97706', '#fffbeb')}
          ${renderStatCard('Total em Atraso', 'alert-triangle', '#dc2626', '#fef2f2')}
        </div>

        <!-- Charts Row -->
        <div class="dashboard-cols-2-1">
          <!-- Monthly Revenue Card -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Faturação Mensal</h3>
                <p class="card-subtitle">Recebido vs. Pendente</p>
              </div>
            </div>
            ${renderChartPlaceholder('Sem dados disponíveis', 'Os dados aparecerão após o primeiro registo')}
            <div style="display: flex; align-items: center; gap: 16px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-subtle); font-size: 12px; color: var(--muted-foreground);">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 6px; border-radius: var(--radius-full); background: var(--primary);"></span> Recebido
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 6px; border-radius: var(--radius-full); background: var(--status-pending);"></span> Pendente
              </div>
            </div>
          </div>

          <!-- Status Distribution Card -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Estado dos Clientes</h3>
                <p class="card-subtitle">Distribuição atual</p>
              </div>
            </div>
            <div class="status-breakdown-list">
              ${statusData.map(s => `
                <div class="status-bar-row">
                  <div class="status-bar-label-wrap">
                    <div class="status-bar-label">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${s.color};"></span>
                      <span>${s.label}</span>
                    </div>
                    <span class="font-mono" style="font-size: 11px; color: var(--muted-foreground);">—</span>
                  </div>
                  <div class="status-bar-track">
                    <div class="status-bar-fill" style="background-color: ${s.color};"></div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-subtle); text-align: center;">
              <p style="font-size: 12px; color: var(--muted-foreground);">Sem dados para calcular distribuição</p>
            </div>
          </div>
        </div>

        <!-- Recent Payments & Quick Actions Row -->
        <div class="dashboard-cols-2-1">
          <!-- Recent Payments -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Pagamentos Recentes</h3>
              <a href="#/pagamentos" class="btn btn-sm btn-ghost">
                Ver todos ${Icons.get('arrow-right', 13)}
              </a>
            </div>
            ${renderEmptyState('credit-card', 'Ainda não existem pagamentos', 'Os pagamentos registados aparecerão aqui')}
          </div>

          <!-- Quick Actions & Alerts -->
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
              ${renderEmptyState('alert-triangle', 'Sem alertas', 'O sistema está a funcionar normalmente')}
            </div>
          </div>
        </div>

        <!-- Clients Needing Attention -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Clientes sem Presença Recente</h3>
              <p class="card-subtitle">Clientes que não frequentam há mais de 7 dias</p>
            </div>
            <a href="#/presencas" class="btn btn-sm btn-ghost">
              Ver presenças ${Icons.get('arrow-right', 13)}
            </a>
          </div>
          ${renderEmptyState('users', 'Ainda não existem registos de clientes', 'Os clientes sem presença recente aparecerão aqui')}
        </div>
      </div>
    `;
  }

  // ─── 2. Clients ───────────────────────────────────────────────────────────

  function renderClients() {
    const columns = ['Cliente', 'Nº Cliente', 'Telefone', 'Plano', 'Estado', 'Última Presença', 'Dias Ausente', 'Próx. Vencimento', 'Em Aberto', 'Ações'];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Clientes',
          'Gestão de todos os clientes',
          `
            <button class="btn btn-sm btn-outline" onclick="UI.showToast('Lista exportada com sucesso')">
              ${Icons.get('download', 13)} Exportar
            </button>
            <a href="#/clientes/novo" class="btn btn-sm btn-primary">
              ${Icons.get('plus', 14)} Novo cliente
            </a>
          `
        )}

        <!-- Filters Bar -->
        <div class="filter-bar">
          <div class="input-wrap filter-input-search">
            <span class="input-icon-left">${Icons.get('search', 14)}</span>
            <input type="text" id="clients-search-input" class="form-input has-icon-left" placeholder="Pesquisar por nome, número ou telefone..." />
          </div>
          <div style="width: 150px;">
            <select class="form-select">
              <option value="">Todos os estados</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="overdue">Em atraso</option>
              <option value="frozen">Congelado</option>
            </select>
          </div>
          <div style="width: 150px;">
            <select class="form-select">
              <option value="">Todos os planos</option>
            </select>
          </div>
          <button class="btn btn-sm btn-outline">
            ${Icons.get('filter', 13)} Filtros
          </button>
        </div>

        <!-- Clients Table Container -->
        <div class="card card-no-padding">
          <div style="padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
            <p style="font-size: 12px; color: var(--muted-foreground);">Todos os clientes</p>
          </div>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${columns.map(col => `<th>${col}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
          </div>

          <div class="pagination-wrap">
            <p>Página 0 de 0 — 0 registos</p>
          </div>
        </div>

        <!-- Table Structure Preview (Matching Figma UI) -->
        <div class="card card-no-padding">
          <div style="padding: 10px 16px; border-bottom: 1px solid var(--border); background-color: var(--muted);">
            <p style="font-size: 12px; font-weight: 500; color: var(--muted-foreground);">Exemplo de estrutura de linha</p>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${columns.map(col => `<th>${col}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${[
                  { name: 'João Silva', num: 'CLI-001', phone: '+351 912 345 678', plan: 'Mensal Livre', status: 'paid', statusLabel: 'Pago' },
                  { name: 'Maria Santos', num: 'CLI-002', phone: '+351 934 567 890', plan: 'Trimestral', status: 'pending', statusLabel: 'Pendente' },
                  { name: 'Carlos Ferreira', num: 'CLI-003', phone: '+351 965 432 109', plan: 'Mensal Manhãs', status: 'overdue', statusLabel: 'Em atraso' },
                ].map(row => `
                  <tr class="hoverable" onclick="window.location.hash = '#/clientes/${row.num}'">
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: var(--accent-foreground); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">
                          ${row.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p style="font-weight: 500; color: var(--foreground);">${row.name}</p>
                          <p style="font-size: 11px; color: var(--muted-foreground);">cliente@exemplo.com</p>
                        </div>
                      </div>
                    </td>
                    <td><span class="font-mono" style="font-size: 12px;">${row.num}</span></td>
                    <td>${row.phone}</td>
                    <td>${row.plan}</td>
                    <td>
                      <span class="badge badge-${row.status}">
                        <span class="badge-dot"></span> ${row.statusLabel}
                      </span>
                    </td>
                    <td><div class="skeleton" style="height: 12px; width: 70px;"></div></td>
                    <td><div class="skeleton" style="height: 12px; width: 30px;"></div></td>
                    <td><div class="skeleton" style="height: 12px; width: 70px;"></div></td>
                    <td><div class="skeleton" style="height: 12px; width: 50px;"></div></td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 4px;" onclick="event.stopPropagation()">
                        <a href="#/clientes/${row.num}" class="btn btn-icon-sm btn-ghost" title="Ver perfil">${Icons.get('eye', 14)}</a>
                        <button class="btn btn-icon-sm btn-ghost" title="Editar" onclick="UI.showToast('Editar ${row.name}')">${Icons.get('edit', 14)}</button>
                        <button class="btn btn-icon-sm btn-ghost" title="Mais opções">${Icons.get('more-vertical', 14)}</button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="padding: 8px 16px; background-color: var(--muted); border-top: 1px solid var(--border);">
            <p style="font-size: 11px; color: var(--muted-foreground);">Pré-visualização da estrutura — sem dados reais</p>
          </div>
        </div>
      </div>
    `;
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
            <!-- Dados Pessoais -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Dados Pessoais</h3>
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Nome completo *</label>
                  <input type="text" class="form-input" placeholder="Nome do cliente" />
                </div>
                <div class="form-group">
                  <label class="form-label">Número de cliente</label>
                  <input type="text" class="form-input" placeholder="Gerado automaticamente" disabled />
                </div>
                <div class="form-group">
                  <label class="form-label">Telefone</label>
                  <input type="tel" class="form-input" placeholder="+351 900 000 000" />
                </div>
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-input" placeholder="email@exemplo.com" />
                </div>
                <div class="form-group">
                  <label class="form-label">Data de nascimento</label>
                  <input type="date" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">NIF</label>
                  <input type="text" class="form-input" placeholder="000 000 000" />
                </div>
                <div class="form-group" style="grid-column: 1 / -1;">
                  <label class="form-label">Morada</label>
                  <input type="text" class="form-input" placeholder="Rua, número, localidade" />
                </div>
              </div>
            </div>

            <!-- Plano Inicial -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Plano Inicial</h3>
              </div>
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label">Plano</label>
                  <select class="form-select">
                    <option value="">Selecionar plano</option>
                    <option value="1">Mensal Livre - 35,00 €</option>
                    <option value="2">Trimestral - 95,00 €</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Data de início</label>
                  <input type="date" class="form-input" />
                </div>
              </div>
            </div>

            <!-- Observações -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Observações</h3>
              </div>
              <textarea class="form-textarea" rows="3" placeholder="Notas internas sobre o cliente..."></textarea>
            </div>
          </div>

          <!-- Sidebar Actions & Photo -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
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
              <button class="btn btn-md btn-primary btn-w-full" onclick="UI.showToast('Cliente guardado com sucesso'); window.location.hash = '#/clientes';">
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

  // ─── 4. Client Profile ────────────────────────────────────────────────────

  function renderClientProfile(id = 'CLI-001') {
    const profileTabs = [
      { id: 'summary', label: 'Resumo' },
      { id: 'personal', label: 'Dados Pessoais' },
      { id: 'plan', label: 'Plano Atual' },
      { id: 'plan-history', label: 'Histórico de Planos' },
      { id: 'payments', label: 'Pagamentos' },
      { id: 'calendar', label: 'Calendário Financeiro' },
      { id: 'attendance', label: 'Presenças' },
      { id: 'freezes', label: 'Congelamentos' },
      { id: 'audit', label: 'Auditoria' },
    ];

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

        <!-- Profile Top Banner Card -->
        <div class="card profile-header-card">
          <div class="profile-banner-stripe"></div>
          <div class="profile-header-content">
            <div class="profile-identity">
              <div class="profile-avatar-lg">
                JS
                <span class="profile-status-indicator"></span>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <h1 style="font-size: 18px; font-weight: 600; color: var(--foreground);">${id === 'novo' ? 'Novo Cliente' : 'João Silva'}</h1>
                  <span class="badge badge-paid"><span class="badge-dot"></span> Ativo</span>
                </div>
                <p class="font-mono" style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Nº ${id}</p>
                <p style="font-size: 12px; color: var(--secondary-foreground); margin-top: 2px;">Plano: Mensal Livre</p>
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-sm btn-outline" onclick="UI.showToast('Ação: Editar cliente')">
                ${Icons.get('edit', 13)} Editar
              </button>
              <button class="btn btn-sm btn-outline" onclick="Pages.openPaymentDrawer()">
                ${Icons.get('credit-card', 13)} Registar Pagamento
              </button>
              <button class="btn btn-sm btn-outline" onclick="UI.showToast('Opções adicionais')">
                Mais ações ▾
              </button>
            </div>
          </div>

          <!-- Quick stats row -->
          <div class="profile-stats-bar">
            <div class="profile-stat-box">
              <p class="profile-stat-label">Estado</p>
              <p class="profile-stat-value">Pago</p>
              <p class="profile-stat-sub">Em dia</p>
            </div>
            <div class="profile-stat-box">
              <p class="profile-stat-label">Próx. Vencimento</p>
              <p class="profile-stat-value">30 Set 2026</p>
              <p class="profile-stat-sub">Em 21 dias</p>
            </div>
            <div class="profile-stat-box">
              <p class="profile-stat-label">Última Presença</p>
              <p class="profile-stat-value">Hoje, 08:30</p>
              <p class="profile-stat-sub">Musculação</p>
            </div>
            <div class="profile-stat-box">
              <p class="profile-stat-label">Em Aberto</p>
              <p class="profile-stat-value">0,00 €</p>
              <p class="profile-stat-sub">Sem pendências</p>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="tabs-container" id="profile-tabs">
          ${profileTabs.map((t, i) => `
            <button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${t.id}">
              ${t.label}
            </button>
          `).join('')}
        </div>

        <!-- Tab Content Target -->
        <div id="profile-tab-content">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Situação Geral</h3>
            </div>
            <p style="font-size: 13px; color: var(--secondary-foreground);">Cliente com inscrição ativa e regular. Todos os pagamentos liquidados até à data.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── 5. Plans ─────────────────────────────────────────────────────────────

  function renderPlans() {
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

        <div class="filter-bar">
          <div class="input-wrap filter-input-search">
            <span class="input-icon-left">${Icons.get('search', 14)}</span>
            <input type="text" class="form-input has-icon-left" placeholder="Pesquisar planos..." />
          </div>
          <div style="width: 150px;">
            <select class="form-select">
              <option value="">Todos os estados</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <div style="display: flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;">
            <button class="btn btn-sm btn-primary" style="border-radius: 0;">Cartões</button>
            <button class="btn btn-sm btn-ghost" style="border-radius: 0;">Tabela</button>
          </div>
        </div>

        <div class="card">
          ${renderEmptyState(
            'file-text',
            'Ainda não existem planos',
            'Crie o primeiro plano para começar a associar clientes',
            `<button class="btn btn-sm btn-primary" onclick="Pages.openPlanDrawer()">${Icons.get('plus', 13)} Criar plano</button>`
          )}
        </div>

        <!-- Skeleton Preview Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
          ${[1, 2, 3].map(i => `
            <div class="card" style="opacity: 0.5;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                <div>
                  <div class="skeleton" style="height: 16px; width: 120px;"></div>
                  <div class="skeleton" style="height: 12px; width: 80px; margin-top: 6px;"></div>
                </div>
                <span class="badge badge-paid"><span class="badge-dot"></span> Ativo</span>
              </div>
              <div style="padding-top: 12px; border-top: 1px solid var(--border-subtle); display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <p style="font-size: 10px; color: var(--muted-foreground); text-transform: uppercase;">Preço</p>
                  <div class="skeleton" style="height: 18px; width: 60px; margin-top: 4px;"></div>
                </div>
                <div>
                  <p style="font-size: 10px; color: var(--muted-foreground); text-transform: uppercase;">Aulas</p>
                  <div class="skeleton" style="height: 18px; width: 40px; margin-top: 4px;"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <p style="text-align: center; font-size: 11px; color: var(--muted-foreground);">Pré-visualização da estrutura de cartões — sem dados reais</p>
      </div>
    `;
  }

  // ─── 6. Payments ──────────────────────────────────────────────────────────

  function renderPayments() {
    const paymentTabs = [
      { id: 'all', label: 'Todos' },
      { id: 'paid', label: 'Pagos' },
      { id: 'pending', label: 'Pendentes' },
      { id: 'overdue', label: 'Em Atraso' },
    ];

    const tableColumns = ['Cliente', 'Plano', 'Período', 'Valor', 'Método', 'Estado', 'Data', 'Ações'];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Pagamentos',
          'Registo e gestão de todos os pagamentos',
          `
            <button class="btn btn-sm btn-outline" onclick="UI.showToast('Exportado com sucesso')">
              ${Icons.get('download', 13)} Exportar
            </button>
            <button class="btn btn-sm btn-primary" onclick="Pages.openPaymentDrawer()">
              ${Icons.get('plus', 14)} Registar pagamento
            </button>
          `
        )}

        <!-- 4 Summary Cards -->
        <div class="stats-grid-4">
          ${renderStatCard('Total Recebido', 'trending-up', '#16a34a', '#f0fdf4')}
          ${renderStatCard('Total Pendente', 'clock', '#d97706', '#fffbeb')}
          ${renderStatCard('Total em Atraso', 'alert-triangle', '#dc2626', '#fef2f2')}
          ${renderStatCard('Total em Aberto', 'dollar-sign', '#64748b', '#f8fafc')}
        </div>

        <!-- Payment Tabs -->
        <div class="tabs-container" id="payment-tabs">
          ${paymentTabs.map((t, i) => `
            <button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
          `).join('')}
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar">
          <div class="input-wrap filter-input-search">
            <span class="input-icon-left">${Icons.get('search', 14)}</span>
            <input type="text" class="form-input has-icon-left" placeholder="Pesquisar por cliente ou plano..." />
          </div>
          <div style="width: 160px;">
            <select class="form-select">
              <option value="">Todos os métodos</option>
              <option value="cash">Numerário</option>
              <option value="transfer">Transferência</option>
              <option value="card">Cartão</option>
              <option value="mbway">MB Way</option>
            </select>
          </div>
          <input type="month" class="form-input" style="width: 150px;" />
          <button class="btn btn-sm btn-outline">${Icons.get('filter', 13)} Filtros</button>
        </div>

        <!-- Table Card -->
        <div class="card card-no-padding">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${tableColumns.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="${tableColumns.length}">
                    ${renderEmptyState(
                      'credit-card',
                      'Ainda não existem pagamentos',
                      'Registe o primeiro pagamento para começar',
                      `<button class="btn btn-sm btn-primary" onclick="Pages.openPaymentDrawer()">${Icons.get('plus', 13)} Registar pagamento</button>`
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

  // ─── 7. Billing ───────────────────────────────────────────────────────────

  function renderBilling() {
    const billingTabs = [
      { id: 'overview', label: 'Resumo' },
      { id: 'monthly', label: 'Por Mês' },
      { id: 'plan', label: 'Por Plano' },
      { id: 'client', label: 'Por Cliente' },
    ];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Faturação',
          'Análise financeira e faturação',
          `
            <select class="form-select" style="width: 100px;">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
            <button class="btn btn-sm btn-outline" onclick="UI.showToast('Relatório financeiro exportado')">
              ${Icons.get('download', 13)} Exportar
            </button>
          `
        )}

        <!-- 5 Stat Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          ${renderStatCard('Total Faturado', 'dollar-sign', '#0f172a', '#f1f5f9')}
          ${renderStatCard('Recebido', 'trending-up', '#16a34a', '#f0fdf4')}
          ${renderStatCard('Pendente', 'clock', '#d97706', '#fffbeb')}
          ${renderStatCard('Em Atraso', 'alert-triangle', '#dc2626', '#fef2f2')}
          ${renderStatCard('Em Aberto', 'dollar-sign', '#64748b', '#f8fafc')}
        </div>

        <div class="tabs-container" id="billing-tabs">
          ${billingTabs.map((t, i) => `
            <button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
          `).join('')}
        </div>

        <div class="dashboard-cols-2-1">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Faturação Mensal</h3>
              <p class="card-subtitle">Evolução ao longo do ano</p>
            </div>
            ${renderChartPlaceholder('Gráfico de barras — faturação por mês')}
          </div>
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Distribuição por Estado</h3>
              <p class="card-subtitle">Composição da faturação</p>
            </div>
            ${renderChartPlaceholder('Gráfico circular — por estado')}
          </div>
        </div>
      </div>
    `;
  }

  // ─── 8. Attendance ────────────────────────────────────────────────────────

  function renderAttendance() {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Presenças',
          'Registo e controlo de frequência',
          `
            <button class="btn btn-sm btn-outline" onclick="UI.showToast('Frequências exportadas')">
              ${Icons.get('download', 13)} Exportar
            </button>
            <button class="btn btn-sm btn-primary" onclick="UI.showToast('Registar presença manual')">
              ${Icons.get('plus', 14)} Registar presença
            </button>
          `
        )}

        <!-- 4 Stats -->
        <div class="stats-grid-4">
          ${renderStatCard('Total de Presenças', 'calendar-check', '#16a34a', '#f0fdf4')}
          ${renderStatCard('Hoje', 'calendar', '#16a34a', '#f0fdf4')}
          ${renderStatCard('Esta Semana', 'calendar', '#0ea5e9', '#f0f9ff')}
          ${renderStatCard('Este Mês', 'calendar', '#d97706', '#fffbeb')}
        </div>

        <!-- Calendar View -->
        <div class="dashboard-cols-2-1">
          <div class="card">
            <div class="cal-header">
              <h3 class="cal-month-title">Setembro 2026</h3>
              <div class="cal-nav-btns">
                <button class="btn btn-icon-sm btn-ghost">${Icons.get('chevron-left', 14)}</button>
                <button class="btn btn-sm btn-ghost" style="color: var(--primary); font-weight: 600;">Hoje</button>
                <button class="btn btn-icon-sm btn-ghost">${Icons.get('chevron-right', 14)}</button>
              </div>
            </div>

            <div class="cal-days-header">
              ${days.map(d => `<div>${d}</div>`).join('')}
            </div>

            <div class="cal-grid">
              ${Array.from({ length: 35 }).map((_, i) => {
                const dayNum = i - 1; // Start Tuesday
                const valid = dayNum >= 1 && dayNum <= 30;
                const isToday = dayNum === 9;
                return `
                  <div class="cal-day-cell ${!valid ? 'is-disabled' : ''} ${isToday ? 'is-today' : ''}" onclick="UI.showToast('Dia ${dayNum} selecionado')">
                    ${valid ? `<span>${dayNum}</span><span class="cal-day-sub">—</span>` : ''}
                  </div>
                `;
              }).join('')}
            </div>

            <div class="cal-legend">
              <div class="cal-legend-item"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary);"></span> Com presenças</div>
              <div class="cal-legend-item"><span style="width: 8px; height: 8px; border-radius: 50%; background: var(--border);"></span> Sem presenças</div>
              <div class="cal-legend-item"><span style="width: 8px; height: 8px; border-radius: 50%; background: #0ea5e9;"></span> Hoje</div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Presenças do Dia</h3>
              </div>
              ${renderEmptyState('calendar', 'Selecione um dia', 'Clique no calendário para ver as presenças')}
            </div>

            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Clientes Ausentes</h3>
                <p class="card-subtitle">Mais de 7 dias sem presença</p>
              </div>
              ${renderEmptyState('users', 'Sem dados')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── 9. Freezes ───────────────────────────────────────────────────────────

  function renderFreezes() {
    const tableColumns = ['Cliente', 'Plano', 'Data Início', 'Data Fim', 'Motivo', 'Estado', 'Ações'];

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

        <!-- 3 Stats -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          ${renderStatCard('Congelamentos Ativos', 'snowflake', '#0ea5e9', '#f0f9ff')}
          ${renderStatCard('Finalizados', 'check-circle', '#16a34a', '#f0fdf4')}
          ${renderStatCard('Total', 'snowflake', '#64748b', '#f8fafc')}
        </div>

        <div class="filter-bar">
          <div class="input-wrap filter-input-search">
            <span class="input-icon-left">${Icons.get('search', 14)}</span>
            <input type="text" class="form-input has-icon-left" placeholder="Pesquisar cliente..." />
          </div>
          <div style="width: 150px;">
            <select class="form-select">
              <option value="">Todos os estados</option>
              <option value="active">Ativo</option>
              <option value="ended">Finalizado</option>
            </select>
          </div>
          <input type="month" class="form-input" style="width: 150px;" />
        </div>

        <div class="card card-no-padding">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${tableColumns.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="${tableColumns.length}">
                    ${renderEmptyState(
                      'snowflake',
                      'Ainda não existem congelamentos',
                      'Congele uma mensalidade para suspender temporariamente um cliente',
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

  // ─── 10. Arrears ──────────────────────────────────────────────────────────

  function renderArrears() {
    const arrearsTabs = [
      { id: 'all', label: 'Todos' },
      { id: '1m', label: '1 Mês' },
      { id: '2m', label: '2 Meses' },
      { id: '3m', label: '3 Meses' },
      { id: '6m', label: '+6 Meses' },
      { id: '12m', label: '+12 Meses' },
    ];

    const tableColumns = ['Cliente', 'Plano', 'Meses em Atraso', 'Valor em Aberto', 'Última Presença', 'Contacto', 'Ações'];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader('Pendências e Atrasos', 'Clientes com mensalidades em atraso')}

        <!-- Risk Summary Cards -->
        <div class="risk-cards-grid">
          <div class="risk-card risk-card-1m">
            <p style="font-size: 11px; text-transform: uppercase; color: var(--muted-foreground);">1 Mês</p>
            <p class="font-mono" style="font-size: 20px; font-weight: 600; margin-top: 6px;">—</p>
            <p style="font-size: 11px; color: var(--muted-foreground); margin-top: 2px;">clientes</p>
          </div>
          <div class="risk-card risk-card-2m">
            <p style="font-size: 11px; text-transform: uppercase; color: var(--muted-foreground);">2 Meses</p>
            <p class="font-mono" style="font-size: 20px; font-weight: 600; margin-top: 6px;">—</p>
            <p style="font-size: 11px; color: var(--muted-foreground); margin-top: 2px;">clientes</p>
          </div>
          <div class="risk-card risk-card-3m">
            <p style="font-size: 11px; text-transform: uppercase; color: var(--muted-foreground);">3 Meses</p>
            <p class="font-mono" style="font-size: 20px; font-weight: 600; margin-top: 6px;">—</p>
            <p style="font-size: 11px; color: var(--muted-foreground); margin-top: 2px;">clientes</p>
          </div>
          <div class="risk-card risk-card-6m">
            <p style="font-size: 11px; text-transform: uppercase; color: var(--muted-foreground);">+6 Meses</p>
            <p class="font-mono" style="font-size: 20px; font-weight: 600; margin-top: 6px;">—</p>
            <p style="font-size: 11px; color: var(--muted-foreground); margin-top: 2px;">clientes</p>
          </div>
          <div class="risk-card risk-card-12m">
            <p style="font-size: 11px; text-transform: uppercase; color: var(--muted-foreground);">+12 Meses</p>
            <p class="font-mono" style="font-size: 20px; font-weight: 600; margin-top: 6px;">—</p>
            <p style="font-size: 11px; color: var(--muted-foreground); margin-top: 2px;">clientes</p>
          </div>
        </div>

        <div class="alert-banner alert-banner-warning">
          ${Icons.get('alert-triangle', 18)}
          <span>Ainda não existem registos de clientes em atraso. Os clientes com mensalidades pendentes aparecerão aqui.</span>
        </div>

        <div class="tabs-container">
          ${arrearsTabs.map((t, i) => `
            <button class="tab-btn ${i === 0 ? 'active' : ''}">${t.label}</button>
          `).join('')}
        </div>

        <div class="card card-no-padding">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${tableColumns.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="${tableColumns.length}">
                    ${renderEmptyState(
                      'alert-triangle',
                      'Sem clientes em atraso',
                      'Todos os clientes estão em dia com os seus pagamentos'
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

  // ─── 11. Inactive Clients ─────────────────────────────────────────────────

  function renderInactiveClients() {
    const tableColumns = ['Cliente', 'Nº Cliente', 'Plano Anterior', 'Data Desativação', 'Motivo', 'Em Aberto', 'Ações'];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader('Clientes Desativados', 'Clientes que saíram ou foram desativados')}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          ${renderStatCard('Total Desativados', 'user-x', '#94a3b8', '#f8fafc')}
          ${renderStatCard('Com Valor em Aberto', 'alert-triangle', '#dc2626', '#fef2f2')}
          ${renderStatCard('Reativações Este Ano', 'rotate-ccw', '#16a34a', '#f0fdf4')}
        </div>

        <div class="filter-bar">
          <div class="input-wrap filter-input-search">
            <span class="input-icon-left">${Icons.get('search', 14)}</span>
            <input type="text" class="form-input has-icon-left" placeholder="Pesquisar cliente desativado..." />
          </div>
          <div style="width: 170px;">
            <select class="form-select">
              <option value="">Todos os motivos</option>
              <option value="voluntary">Saída voluntária</option>
              <option value="debt">Dívida</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <input type="month" class="form-input" style="width: 150px;" />
        </div>

        <div class="card card-no-padding">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  ${tableColumns.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="${tableColumns.length}">
                    ${renderEmptyState(
                      'user-x',
                      'Nenhum cliente desativado',
                      'Os clientes desativados aparecerão aqui'
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

  // ─── 12. Reports ──────────────────────────────────────────────────────────

  function renderReports() {
    const reportCategories = [
      { id: 'clients', label: 'Clientes', icon: 'users' },
      { id: 'payments', label: 'Pagamentos', icon: 'credit-card' },
      { id: 'arrears', label: 'Atrasos', icon: 'alert-triangle' },
      { id: 'attendance', label: 'Presenças', icon: 'calendar' },
      { id: 'freezes', label: 'Congelamentos', icon: 'snowflake' },
      { id: 'billing', label: 'Faturação', icon: 'trending-up' },
      { id: 'inactive', label: 'Desativados', icon: 'user-x' },
    ];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Relatórios',
          'Análise detalhada por categoria',
          `
            <button class="btn btn-sm btn-outline" onclick="UI.showToast('Exportando PDF...')">
              ${Icons.get('download', 13)} Exportar PDF
            </button>
            <button class="btn btn-sm btn-outline" onclick="UI.showToast('Exportando Excel...')">
              ${Icons.get('download', 13)} Exportar Excel
            </button>
          `
        )}

        <div class="subpage-layout">
          <!-- Sidebar categories -->
          <div class="subpage-sidebar">
            <div class="subpage-nav-card">
              ${reportCategories.map((c, i) => `
                <button class="subpage-nav-item ${i === 0 ? 'active' : ''}" onclick="UI.showToast('Carregando relatório de ${c.label}')">
                  ${Icons.get(c.icon, 16)}
                  <span>${c.label}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Main Report Content -->
          <div class="subpage-content">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <h2 style="font-size: 16px; font-weight: 600; font-family: var(--font-heading);">Relatório de Clientes</h2>
                <p style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Sem período selecionado — todos os dados</p>
              </div>
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-sm btn-primary">7d</button>
                <button class="btn btn-sm btn-ghost">30d</button>
                <button class="btn btn-sm btn-ghost">90d</button>
                <button class="btn btn-sm btn-ghost">1a</button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
              ${renderStatCard('Ativos', 'users', '#16a34a', '#f0fdf4')}
              ${renderStatCard('Novos este mês', 'plus', '#0ea5e9', '#f0f9ff')}
              ${renderStatCard('Taxa de retenção', 'trending-up', '#d97706', '#fffbeb')}
            </div>

            <div class="dashboard-cols-2-1">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Evolução Temporal</h3>
                </div>
                ${renderChartPlaceholder('Gráfico de linha — evolução ao longo do tempo')}
              </div>
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">Distribuição</h3>
                </div>
                ${renderChartPlaceholder('Gráfico de barras — por categoria')}
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Detalhe do Relatório</h3>
              </div>
              ${renderEmptyState('bar-chart-2', 'Sem dados disponíveis', 'Os dados aparecerão após o primeiro registo no sistema')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── 13. Audit ────────────────────────────────────────────────────────────

  function renderAudit() {
    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader(
          'Histórico e Auditoria',
          'Registo completo de todas as ações realizadas no sistema',
          `
            <button class="btn btn-sm btn-outline" onclick="UI.showToast('Histórico exportado')">
              ${Icons.get('download', 13)} Exportar
            </button>
          `
        )}

        <div class="tabs-container">
          <button class="tab-btn active">Timeline</button>
          <button class="tab-btn">Tabela</button>
        </div>

        <div class="filter-bar">
          <div class="input-wrap filter-input-search">
            <span class="input-icon-left">${Icons.get('search', 14)}</span>
            <input type="text" class="form-input has-icon-left" placeholder="Pesquisar eventos..." />
          </div>
          <div style="width: 160px;">
            <select class="form-select">
              <option value="">Todas as ações</option>
              <option value="payment">Pagamento</option>
              <option value="client">Cliente</option>
              <option value="plan">Plano</option>
              <option value="freeze">Congelamento</option>
            </select>
          </div>
          <button class="btn btn-sm btn-outline">${Icons.get('filter', 13)} Filtros</button>
        </div>

        <div class="dashboard-cols-2-1">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Linha de Tempo</h3>
              <p class="card-subtitle">Atividade cronológica do sistema</p>
            </div>
            ${renderEmptyState('clock', 'Sem eventos de auditoria', 'As ações realizadas no sistema aparecerão aqui em ordem cronológica')}

            <!-- Skeleton Timeline Preview -->
            <div class="timeline-list" style="margin-top: 16px; opacity: 0.4;">
              ${[
                { title: 'Pagamento registado', color: '#f0fdf4', iconColor: '#16a34a' },
                { title: 'Cliente criado', color: '#eff6ff', iconColor: '#1d4ed8' },
                { title: 'Plano alterado', color: '#fef3c7', iconColor: '#b45309' },
              ].map(t => `
                <div class="timeline-item">
                  <div class="timeline-track">
                    <div class="timeline-node" style="background-color: ${t.color}; color: ${t.iconColor};">
                      <span style="width: 6px; height: 6px; border-radius: 50%; background: currentColor;"></span>
                    </div>
                    <div class="timeline-line"></div>
                  </div>
                  <div class="timeline-content">
                    <p class="timeline-title">${t.title}</p>
                    <div class="skeleton" style="height: 12px; width: 140px; margin-top: 4px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Detalhe do Evento</h3>
            </div>
            ${renderEmptyState('eye', 'Nenhum evento selecionado', 'Clique num evento para ver os detalhes')}
          </div>
        </div>
      </div>
    `;
  }

  // ─── 14. Integrations ─────────────────────────────────────────────────────

  function renderIntegrations() {
    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader('Integrações', 'Gestão de conexões com sistemas externos')}

        <div class="alert-banner alert-banner-info">
          ${Icons.get('alert-circle', 18)}
          <div>
            <p style="font-weight: 600;">Integração visual apenas</p>
            <p style="font-size: 12px; margin-top: 2px;">As integrações abaixo são representações visuais do estado. A configuração funcional será implementada numa fase posterior.</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- CRM Integration -->
          <div class="integration-card">
            <div class="integration-top">
              <div class="integration-logo-wrap">
                <div class="integration-logo-box">
                  <span style="font-size: 16px; font-weight: 700; color: var(--primary); font-family: var(--font-heading);">CRM</span>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 style="font-size: 14px; font-weight: 600; font-family: var(--font-heading);">CRM</h3>
                    <span class="badge badge-overdue"><span class="badge-dot"></span> Desconectado</span>
                  </div>
                  <p style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Sistema de gestão de relacionamento com clientes</p>
                </div>
              </div>
              <button class="btn btn-sm btn-ghost" onclick="UI.showToast('Detalhes da integração CRM')">Detalhes</button>
            </div>
          </div>

          <!-- OVG Integration -->
          <div class="integration-card">
            <div class="integration-top">
              <div class="integration-logo-wrap">
                <div class="integration-logo-box">
                  <span style="font-size: 16px; font-weight: 700; color: #0369a1; font-family: var(--font-heading);">OVG</span>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 style="font-size: 14px; font-weight: 600; font-family: var(--font-heading);">OVG</h3>
                    <span class="badge badge-overdue"><span class="badge-dot"></span> Desconectado</span>
                  </div>
                  <p style="font-size: 12px; color: var(--muted-foreground); margin-top: 2px;">Sistema de gestão e operações da organização</p>
                </div>
              </div>
              <button class="btn btn-sm btn-ghost" onclick="UI.showToast('Detalhes da integração OVG')">Detalhes</button>
            </div>
          </div>

          <!-- Add integration placeholder -->
          <div style="border: 2px dashed var(--border); border-radius: var(--radius-md); padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; cursor: pointer; transition: all var(--transition-fast);" onclick="UI.showToast('Adicionar integração em breve')">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--secondary); display: flex; align-items: center; justify-content: center; color: var(--muted-foreground);">
              ${Icons.get('plus', 18)}
            </div>
            <p style="font-size: 14px; font-weight: 500; color: #475569;">Adicionar nova integração</p>
            <p style="font-size: 12px; color: var(--muted-foreground);">Conecte sistemas adicionais para expandir as funcionalidades</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── 15. Settings ─────────────────────────────────────────────────────────

  function renderSettings() {
    const sections = [
      { id: 'profile', label: 'Perfil', icon: 'user' },
      { id: 'preferences', label: 'Preferências', icon: 'settings' },
      { id: 'plans', label: 'Planos', icon: 'file-text' },
      { id: 'payments', label: 'Métodos de Pagamento', icon: 'credit-card' },
      { id: 'schedule', label: 'Dias de Funcionamento', icon: 'calendar' },
      { id: 'notifications', label: 'Notificações', icon: 'bell' },
      { id: 'permissions', label: 'Permissões', icon: 'shield' },
    ];

    return `
      <div class="page-container" style="display: flex; flex-direction: column; gap: 16px;">
        ${renderSectionHeader('Definições', 'Configuração do sistema')}

        <div class="subpage-layout">
          <div class="subpage-sidebar">
            <div class="subpage-nav-card">
              ${sections.map((s, i) => `
                <button class="subpage-nav-item ${i === 0 ? 'active' : ''}" onclick="UI.showToast('Seção: ${s.label}')">
                  ${Icons.get(s.icon, 15)}
                  <span>${s.label}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="subpage-content">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Perfil do Sistema</h3>
                <p class="card-subtitle">Informações sobre o ginásio</p>
              </div>

              <div class="form-section">
                <p class="form-section-title">Informações Gerais</p>
                <div class="form-grid-2" style="margin-top: 12px;">
                  <div class="form-group">
                    <label class="form-label">Nome do ginásio</label>
                    <input type="text" class="form-input" value="SamoraFit" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Email de contacto</label>
                    <input type="email" class="form-input" value="info@samorafit.pt" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Telefone</label>
                    <input type="tel" class="form-input" value="+351 200 000 000" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Website</label>
                    <input type="url" class="form-input" value="https://samorafit.pt" />
                  </div>
                </div>
              </div>

              <div class="form-section">
                <p class="form-section-title">Preferências Visuais & Notificações</p>
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
                  <div class="toggle-row">
                    <div>
                      <p class="toggle-row-label">Confirmação antes de eliminar</p>
                      <p class="toggle-row-desc">Mostrar diálogo de confirmação em ações destrutivas</p>
                    </div>
                    <button class="toggle-switch active"><span class="toggle-handle"></span></button>
                  </div>
                  <div class="toggle-row">
                    <div>
                      <p class="toggle-row-label">Alertas por email</p>
                      <p class="toggle-row-desc">Receber notificações de pagamentos pendentes</p>
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
                <button class="btn btn-sm btn-primary" onclick="UI.showToast('Alterações guardadas com sucesso')">
                  ${Icons.get('save', 13)} Guardar alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Drawers Launchers ────────────────────────────────────────────────────

  function openPlanDrawer() {
    UI.openDrawer({
      title: 'Novo Plano',
      subtitle: 'Preencha os detalhes do plano',
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="form-section">
            <p class="form-section-title">Informações Gerais</p>
            <div class="form-group" style="margin-top: 10px;">
              <label class="form-label">Nome do plano *</label>
              <input type="text" class="form-input" placeholder="Ex: Mensal Ilimitado" />
            </div>
            <div class="form-grid-2" style="margin-top: 10px;">
              <div class="form-group">
                <label class="form-label">Preço (€) *</label>
                <input type="number" class="form-input" placeholder="0,00" />
              </div>
              <div class="form-group">
                <label class="form-label">Validade</label>
                <select class="form-select">
                  <option value="30">30 dias</option>
                  <option value="60">60 dias</option>
                  <option value="90">90 dias</option>
                  <option value="365">12 meses</option>
                </select>
              </div>
            </div>
          </div>
          <div class="form-section">
            <p class="form-section-title">Aulas e Utilização</p>
            <div class="form-grid-2" style="margin-top: 10px;">
              <div class="form-group">
                <label class="form-label">Quantidade de aulas</label>
                <input type="text" class="form-input" placeholder="Ilimitadas" />
              </div>
              <div class="form-group">
                <label class="form-label">Tipo de acesso</label>
                <select class="form-select">
                  <option value="unlimited">Ilimitado</option>
                  <option value="limited">Limitado</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-sm btn-outline" onclick="UI.closeDrawer()">Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="UI.showToast('Plano guardado com sucesso'); UI.closeDrawer();">Guardar plano</button>
      `
    });
  }

  function openPaymentDrawer() {
    UI.openDrawer({
      title: 'Registar Pagamento',
      subtitle: 'Preencha os dados do pagamento',
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="form-section">
            <p class="form-section-title">Cliente e Plano</p>
            <div class="form-group" style="margin-top: 10px;">
              <label class="form-label">Cliente *</label>
              <select class="form-select">
                <option value="">Selecionar cliente...</option>
                <option value="1">João Silva (CLI-001)</option>
                <option value="2">Maria Santos (CLI-002)</option>
              </select>
            </div>
            <div class="form-group" style="margin-top: 10px;">
              <label class="form-label">Plano *</label>
              <select class="form-select">
                <option value="">Selecionar plano...</option>
                <option value="1">Mensal Livre (35,00 €)</option>
              </select>
            </div>
          </div>

          <div class="form-section">
            <p class="form-section-title">Pagamento</p>
            <div class="form-grid-2" style="margin-top: 10px;">
              <div class="form-group">
                <label class="form-label">Valor (€) *</label>
                <input type="number" class="form-input" placeholder="35,00" />
              </div>
              <div class="form-group">
                <label class="form-label">Data do pagamento *</label>
                <input type="date" class="form-input" />
              </div>
            </div>
            <div class="form-group" style="margin-top: 10px;">
              <label class="form-label">Método de pagamento *</label>
              <select class="form-select">
                <option value="cash">Numerário</option>
                <option value="transfer">Transferência</option>
                <option value="card">Cartão</option>
                <option value="mbway">MB Way</option>
              </select>
            </div>
          </div>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-sm btn-outline" onclick="UI.closeDrawer()">Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="UI.showToast('Pagamento registado com sucesso'); UI.closeDrawer();">Registar pagamento</button>
      `
    });
  }

  function openFreezeDrawer() {
    UI.openDrawer({
      title: 'Novo Congelamento',
      subtitle: 'Suspender temporariamente a mensalidade de um cliente',
      contentHtml: `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="form-section">
            <p class="form-section-title">Cliente</p>
            <div class="form-group" style="margin-top: 10px;">
              <label class="form-label">Cliente *</label>
              <select class="form-select">
                <option value="">Selecionar cliente...</option>
                <option value="1">João Silva (CLI-001)</option>
              </select>
            </div>
          </div>

          <div class="form-section">
            <p class="form-section-title">Período do Congelamento</p>
            <div class="form-grid-2" style="margin-top: 10px;">
              <div class="form-group">
                <label class="form-label">Data de início *</label>
                <input type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Data de fim *</label>
                <input type="date" class="form-input" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <p class="form-section-title">Motivo</p>
            <div class="form-group" style="margin-top: 10px;">
              <select class="form-select">
                <option value="health">Motivos de saúde</option>
                <option value="travel">Viagem</option>
                <option value="personal">Motivos pessoais</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-sm btn-outline" onclick="UI.closeDrawer()">Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="UI.showToast('Congelamento guardado com sucesso'); UI.closeDrawer();">Guardar congelamento</button>
      `
    });
  }

  return {
    renderDashboard,
    renderClients,
    renderNewClient,
    renderClientProfile,
    renderPlans,
    renderPayments,
    renderBilling,
    renderAttendance,
    renderFreezes,
    renderArrears,
    renderInactiveClients,
    renderReports,
    renderAudit,
    renderIntegrations,
    renderSettings,
    openPlanDrawer,
    openPaymentDrawer,
    openFreezeDrawer,
  };
})();

if (typeof window !== 'undefined') window.Pages = Pages;
if (typeof globalThis !== 'undefined') globalThis.Pages = Pages;
