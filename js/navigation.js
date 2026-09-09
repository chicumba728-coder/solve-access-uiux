/**
 * Solve Acess — Pure Vanilla JS Hash-based Router
 * Fast, flicker-free, zero-build navigation
 */

const Router = (() => {
  const routes = [
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
      path: /^#\/integracoes$/,
      name: 'integracoes',
      title: 'Integrações',
      breadcrumbs: [{ label: 'Dashboard', href: '#/' }, { label: 'Integrações' }],
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

    currentRouteName = matched.name;

    // Update Header
    updateHeader(matched.title, matched.breadcrumbs);

    // Update Sidebar active state
    updateSidebarNav(matched.name);

    // Render Content
    const pageContent = document.getElementById('page-content');
    if (pageContent) {
      pageContent.innerHTML = matched.render(matchArgs);
      pageContent.scrollTop = 0;
    }

    // Close mobile drawer on route change
    UI.closeMobileSidebar();

    // Re-bind interactive components in new page DOM
    postRenderSetup(matched.name);
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
    // Bind toggle switches in newly rendered DOM
    UI.bindToggles('#page-content');

    // Bind tabs in profile
    if (name === 'clientes') {
      const profileTabs = document.getElementById('profile-tabs');
      if (profileTabs) {
        profileTabs.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            profileTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const content = document.getElementById('profile-tab-content');
            if (content) {
              content.innerHTML = `
                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title">${btn.textContent.trim()}</h3>
                  </div>
                  <p style="font-size: 13px; color: var(--muted-foreground);">Dados da aba "${btn.textContent.trim()}" carregados.</p>
                </div>
              `;
            }
          });
        });
      }
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
