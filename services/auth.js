/**
 * Solve Acess — Authentication Manager
 * Handles login, logout, JWT token storage and session validation.
 */

const Auth = (() => {
  const TOKEN_KEY = 'solve_access_token';
  const USER_KEY = 'solve_access_user';

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function decodeToken(token) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map((c) =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function getUser() {
    const cached = localStorage.getItem(USER_KEY);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* ignore */ }
    }
    const token = getToken();
    if (!token) return null;
    const payload = decodeToken(token);
    if (!payload) return null;
    const user = {
      id: payload.sub,
      roles: payload.roles || [],
      exp: payload.exp ? payload.exp * 1000 : null
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }

  function isAuthenticated() {
    const token = getToken();
    if (!token) return false;
    const user = getUser();
    if (!user) return false;
    if (user.exp && user.exp < Date.now()) {
      clearSession();
      return false;
    }
    return true;
  }

  async function login(email, password) {
    const data = await API.login(email, password);
    setToken(data.accessToken);
    localStorage.removeItem(USER_KEY);
    return getUser();
  }

  function logout() {
    clearSession();
    if (typeof Router !== 'undefined' && Router.navigate) {
      Router.navigate('#/login');
    } else {
      window.location.hash = '#/login';
    }
  }

  function onUnauthorized() {
    clearSession();
    if (window.Auth && window.Auth.showLogin) {
      window.Auth.showLogin();
    } else if (typeof Router !== 'undefined' && Router.navigate) {
      Router.navigate('#/login');
    } else {
      window.location.hash = '#/login';
    }
  }

  function requireAuth() {
    if (!isAuthenticated() && window.location.hash !== '#/login') {
      window.location.hash = '#/login';
      return false;
    }
    return true;
  }

  return {
    TOKEN_KEY,
    login,
    logout,
    getToken,
    getUser,
    isAuthenticated,
    requireAuth,
    clearSession,
    onUnauthorized
  };
})();

if (typeof window !== 'undefined') window.Auth = Auth;
if (typeof globalThis !== 'undefined') globalThis.Auth = Auth;