/**
 * Solve Acess — Main Application Entrypoint
 * Boots up UI listeners, Icons, Auth and Hash Router
 */

document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  initAuth();
  Router.init();
  console.log('Solve Acess frontend initialized.');
});

function initAuth() {
  const overlay = document.getElementById('login-overlay');
  const appShell = document.getElementById('app');
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorBox = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit-btn');

  function showApp() {
    if (overlay) overlay.classList.add('hidden');
    if (appShell) appShell.style.display = '';
    updateUserHeader();
    updateTerminalsPill();
    if (typeof Router !== 'undefined' && Router.navigate) {
      Router.navigate(window.location.hash || '#/');
    }
  }

  function showLogin() {
    if (overlay) overlay.classList.remove('hidden');
    if (appShell) appShell.style.display = 'none';
  }

  function updateUserHeader() {
    const user = Auth.getUser();
    if (!user) return;
    const nameEl = document.querySelector('.user-info-name');
    const roleEl = document.querySelector('.user-info-role');
    const avatarEl = document.querySelector('.user-avatar-pill');
    if (nameEl) {
      const firstRole = user.roles && user.roles.length ? user.roles[0] : 'Operador';
      const roleLabel = firstRole.charAt(0) + firstRole.slice(1).toLowerCase();
      nameEl.textContent = roleLabel === 'Admin' ? 'Admin' : roleLabel;
    }
    if (roleEl) {
      const firstRole = (user.roles && user.roles.length ? user.roles[0] : 'OPERATOR') || 'ADMIN';
      roleEl.textContent = firstRole.charAt(0) + firstRole.slice(1).toLowerCase();
    }
    if (avatarEl && user.id) {
      avatarEl.textContent = (nameEl ? nameEl.textContent[0] : 'A').toUpperCase();
    }
  }

  function showError(message) {
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.classList.add('visible');
    }
  }

  function clearError() {
    if (errorBox) errorBox.classList.remove('visible');
  }

  function setLoading(loading) {
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.classList.toggle('loading', loading);
      const label = submitBtn.querySelector('.btn-login-label');
      if (label) label.textContent = loading ? 'A entrar...' : 'Entrar';
    }
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearError();
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      if (!email || !password) {
        showError('Introduza o email e a senha.');
        return;
      }
      setLoading(true);
      try {
        await Auth.login(email, password);
        showApp();
      } catch (error) {
        showError(error.message || 'Falha ao iniciar sessão. Verifique as credenciais.');
        if (passwordInput) passwordInput.value = '';
      } finally {
        setLoading(false);
      }
    });
  }

  window.Auth.showApp = showApp;
  window.Auth.showLogin = showLogin;
  window.Auth.updateUserHeader = updateUserHeader;

  if (Auth.isAuthenticated()) {
    showApp();
  } else {
    showLogin();
  }

  setupHeaderSearch();
  setInterval(updateTerminalsPill, 60000);
}

async function updateTerminalsPill() {
  if (!Auth.isAuthenticated()) return;
  try {
    const terminals = await API.terminals.list();
    const total = terminals.length;
    const now = Date.now();
    const onlineCount = terminals.filter((t) => {
      if (!t.isActive) return false;
      if (!t.lastSeenAt) return false;
      return now - new Date(t.lastSeenAt).getTime() < 5 * 60 * 1000;
    }).length;
    const pillText = document.getElementById('terminals-pill-text');
    if (pillText) {
      pillText.innerHTML = total > 0 ? `Terminais: <strong>${onlineCount} / ${total}</strong> Online` : 'Sem terminais';
    }
    const pill = document.getElementById('terminals-pill');
    if (pill) {
      const hasOnline = onlineCount > 0;
      pill.style.backgroundColor = hasOnline ? '#f0fdf4' : '#f8fafc';
      pill.style.borderColor = hasOnline ? '#bbf7d0' : '#e2e8f0';
      pill.style.color = hasOnline ? '#15803d' : '#64748b';
    }
  } catch { /* ignore */ }
}

function setupHeaderSearch() {
  const searchInput = document.getElementById('header-search-input');
  if (!searchInput) return;
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const term = searchInput.value.trim();
      if (term) {
        try { sessionStorage.setItem('solve_header_search', term); } catch { /* ignore */ }
        if (window.location.hash === '#/clientes') {
          if (typeof Pages !== 'undefined' && Pages.bindClientsPage) {
            Pages.bindClientsPage();
          }
        } else {
          window.location.hash = '#/clientes';
        }
        searchInput.blur();
      }
    }
  });
}

window.updateTerminalsPill = updateTerminalsPill;