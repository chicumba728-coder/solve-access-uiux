/**
 * Solve Acess — Pure Vanilla JS Hash-based Router
 * Fast, flicker-free, zero-build navigation
 */

const Router = (() => {
  const routes = [
    {
      path: /^#\/login$/,
      name: 'login',
      title: 'Iniciar Sessão',
      breadcrumbs: [{ label: 'Login' }],
      render: () => ''
    },
    {
      path: /^#\/?$/,
      name: 'dashboard',
      title: 'Dashboard',
      breadcrumbs: [{ label: 'Dashboard' }],
      render: () => Pages.renderDashboard()
    },
    {
      path: /^#\/dashboard$/,
      name: 'dashboard',
      title: 'Dashboard',
      breadcrumbs: [{ label: 'Dashboard' }],
      render: () => Pages.renderDashboard()
    },
    {
      path: /^#\/clientes\/novo$/,
      name: 'clientes',
      title: 'Novo Cliente',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Clientes', href: '#/clientes' }, { label: 'Novo Cliente' }],
      render: () => Pages.renderNewClient()
    },
    {
      path: /^#\/clientes\/(.+)$/,
      name: 'clientes',
      title: 'Perfil do Cliente',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Clientes', href: '#/clientes' }, { label: 'Perfil' }],
      render: (match) => Pages.renderClientProfile(match[1])
    },
    {
      path: /^#\/clientes$/,
      name: 'clientes',
      title: 'Clientes',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Clientes' }],
      render: () => Pages.renderClients()
    },
    {
      path: /^#\/planos$/,
      name: 'planos',
      title: 'Planos',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Planos' }],
      render: () => Pages.renderPlans()
    },
    {
      path: /^#\/pagamentos$/,
      name: 'pagamentos',
      title: 'Pagamentos',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Pagamentos' }],
      render: () => Pages.renderPayments()
    },
    {
      path: /^#\/faturacao$/,
      name: 'faturacao',
      title: 'Faturação',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Faturação' }],
      render: () => Pages.renderBilling()
    },
    {
      path: /^#\/presencas$/,
      name: 'presencas',
      title: 'Presenças',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Presenças' }],
      render: () => Pages.renderAttendance()
    },
    {
      path: /^#\/terminais$/,
      name: 'terminais',
      title: 'Terminais de Acesso',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Operações' }, { label: 'Terminais de Acesso' }],
      render: () => Pages.renderTerminals()
    },
    {
      path: /^#\/acessos$/,
      name: 'acessos',
      title: 'Histórico de Acessos',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Operações' }, { label: 'Histórico de Acessos' }],
      render: () => Pages.renderAccessEvents()
    },
    {
      path: /^#\/congelamentos$/,
      name: 'congelamentos',
      title: 'Congelamentos',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Congelamentos' }],
      render: () => Pages.renderFreezes()
    },
    {
      path: /^#\/pendencias$/,
      name: 'pendencias',
      title: 'Pendências e Atrasos',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Pendências e Atrasos' }],
      render: () => Pages.renderArrears()
    },
    {
      path: /^#\/desativados$/,
      name: 'desativados',
      title: 'Clientes Desativados',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Clientes Desativados' }],
      render: () => Pages.renderInactiveClients()
    },
    {
      path: /^#\/relatorios$/,
      name: 'relatorios',
      title: 'Relatórios',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Relatórios' }],
      render: () => Pages.renderReports()
    },
    {
      path: /^#\/auditoria$/,
      name: 'auditoria',
      title: 'Histórico e Auditoria',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Auditoria' }],
      render: () => Pages.renderAudit()
    },
    {
      path: /^#\/ovg$/,
      name: 'ovg',
      title: 'OVG',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Sistema' }, { label: 'OVG' }],
      render: () => Pages.renderIntegrations()
    },
    {
      path: /^#\/integracoes$/,
      name: 'ovg',
      title: 'OVG',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Sistema' }, { label: 'OVG' }],
      render: () => Pages.renderIntegrations()
    },
    {
      path: /^#\/definicoes$/,
      name: 'definicoes',
      title: 'Definições',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Definições' }],
      render: () => Pages.renderSettings()
    }
  ];

  let currentRouteName = '';

  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  function handleRoute() {
    const hash = window.location.hash || '#/';
    let matched = null;
    let matchArgs = null;

    for (const route of routes) {
      const match = hash.match(route.path);
      if (match) {
        matched = route;
        matchArgs = match;
        break;
      }
    }

    if (!matched) {
      // Default fallback
      matched = routes[0];
    }

    if (matched.name !== 'login' && typeof Auth !== 'undefined' && !Auth.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }

    currentRouteName = matched.name;

    // Update Header
    updateHeader(matched.title, matched.breadcrumbs);

    // Update Sidebar active state
    updateSidebarNav(matched.name);

    // Render Content (support both sync and async renderers)
    const pageContent = document.getElementById('page-content');
    if (pageContent) {
      pageContent.innerHTML = getLoadingSkeleton();
      const result = matched.render(matchArgs);

      if (result && typeof result.then === 'function') {
        result
          .then((html) => {
            if (pageContent && currentRouteName === matched.name) {
              pageContent.innerHTML = html;
              pageContent.scrollTop = 0;
            }
            postRenderSetup(matched.name);
          })
          .catch((error) => {
            if (pageContent && currentRouteName === matched.name) {
              pageContent.innerHTML = getErrorState(error);
            }
            postRenderSetup(matched.name);
          });
      } else {
        pageContent.innerHTML = result || '';
        pageContent.scrollTop = 0;
        postRenderSetup(matched.name);
      }
    } else {
      postRenderSetup(matched.name);
    }

    // Close mobile drawer on route change
    UI.closeMobileSidebar();
  }

  function getLoadingSkeleton() {
    return `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 50vh; flex-direction: column; gap: 12px;">
        <div style="width: 36px; height: 36px; border: 3px solid var(--primary-muted); border-top-color: var(--primary); border-radius: 50%; animation: spinner-rotate 0.7s linear infinite;"></div>
        <p style="font-size: 13px; color: var(--muted-foreground);">A carregar dados...</p>
      </div>
    `;
  }

  function getErrorState(error) {
    return `
      <div class="card" style="max-width: 480px; margin: 60px auto; text-align: center; padding: 32px;">
        <div style="width: 48px; height: 48px; margin: 0 auto 16px; border-radius: var(--radius-lg); background: var(--danger-bg); color: var(--danger); display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
        </div>
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 6px; color: var(--foreground);">Erro ao carregar dados</h3>
        <p style="font-size: 13px; color: var(--muted-foreground); margin-bottom: 16px;">${(error.message || 'Ocorreu um erro inesperado.').replace(/</g, '&lt;')}</p>
        <button class="btn btn-primary" onclick="location.reload()">Tentar de novo</button>
      </div>
    `;
  }

  function updateHeader(title, breadcrumbs) {
    const container = document.getElementById('header-title-container');
    if (!container) return;

    if (breadcrumbs && breadcrumbs.length > 1) {
      container.innerHTML = `
        <div class="breadcrumbs">
          ${breadcrumbs.map((b, i) => {
            const isLast = i === breadcrumbs.length - 1;
            if (isLast) {
              return `<span class="breadcrumbs-current">${b.label}</span>`;
            }
            return `
              <a href="${b.href || '#/'}">${b.label}</a>
              <span class="breadcrumbs-sep">/</span>
            `;
          }).join('')}
        </div>
      `;
    } else {
      container.innerHTML = `<h1 class="header-page-title">${title}</h1>`;
    }

    document.title = `${title} — Solve Acess`;
  }

  function updateSidebarNav(name) {
    document.querySelectorAll('#sidebar .nav-item').forEach(item => {
      const itemRoute = item.getAttribute('data-route');
      if (itemRoute === name) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  function postRenderSetup(name) {
    UI.bindToggles('#page-content');

    if (name === 'clientes') {
      const profileTabs = document.getElementById('profile-tabs');
      const profileTabContent = document.getElementById('profile-tab-content');
      if (profileTabs && profileTabContent) {
        const clientId = (window.location.hash.match(/#\/clientes\/([^/]+)/) || [])[1];
        profileTabs.querySelectorAll('.tab-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            profileTabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            profileTabContent.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: center; padding: 24px;">
                <div style="width: 28px; height: 28px; border: 3px solid var(--primary-muted); border-top-color: var(--primary); border-radius: 50%; animation: spinner-rotate 0.7s linear infinite;"></div>
              </div>
            `;
            if (typeof Pages !== 'undefined' && Pages.renderProfileTabContent) {
              Pages.renderProfileTabContent(tabId, clientId).then((html) => {
                if (profileTabContent) profileTabContent.innerHTML = html;
              }).catch(() => {
                if (profileTabContent) profileTabContent.innerHTML = '<div class="card"><p style="font-size:13px;color:var(--muted-foreground);padding:16px;">Erro ao carregar conteúdo da aba.</p></div>';
              });
            }
          });
        });
      }

      if (name === 'clientes' && typeof Pages !== 'undefined' && Pages.bindClientsPage) {
        Pages.bindClientsPage();
      }
    }

    if (name === 'dashboard' && typeof Pages !== 'undefined' && Pages.bindDashboardPeriod) {
      Pages.bindDashboardPeriod();
      if (Pages.bindDashboardAutoRefresh) Pages.bindDashboardAutoRefresh();
    }

    if (name === 'relatorios' && typeof Pages !== 'undefined' && Pages.bindReportsTabs) {
      Pages.bindReportsTabs();
    }

    if (name === 'presencas' && typeof Pages !== 'undefined' && Pages.bindAttendancePage) {
      Pages.bindAttendancePage();
    }

    if (name === 'pagamentos' && typeof Pages !== 'undefined' && Pages.bindPaymentsPage) {
      Pages.bindPaymentsPage();
    }
  }

  function navigate(path) {
    window.location.hash = path;
  }

  return {
    init,
    navigate,
    getCurrentRoute: () => currentRouteName
  };
})();

if (typeof window !== 'undefined') window.Router = Router;
if (typeof globalThis !== 'undefined') globalThis.Router = Router;
