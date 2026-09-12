/**
 * Solve Acess — API Client (Express + Prisma backend)
 * Centralized HTTP client with JWT auth, error handling and endpoint mapping.
 */

const API = (() => {
  const BASE_URL = '/api/v1';
  const TOKEN_KEY = 'solve_access_token';
  const DEFAULT_LIMIT = 100;

  async function request(method, path, body) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (error) {
      handleNetworkError(error);
      throw error;
    }

    if (response.status === 401) {
      handleUnauthorized();
      const err = new Error('Sessão expirada. Inicie sessão novamente.');
      err.status = 401;
      throw err;
    }

    let data = null;
    try {
      data = await response.json();
    } catch { /* no body */ }

    if (!response.ok) {
      const message = data?.error?.message || `Erro ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.details = data?.error;
      handleErrorToast(message, response.status);
      throw error;
    }

    return data;
  }

  function handleNetworkError(error) {
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('Não foi possível contactar o servidor. Verifique se o backend está em execução.', 'error');
    }
  }

  function handleErrorToast(message, status) {
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast(message, 'error');
    }
  }

  function handleUnauthorized() {
    localStorage.removeItem(TOKEN_KEY);
    if (typeof Auth !== 'undefined' && Auth.onUnauthorized) {
      Auth.onUnauthorized();
    } else {
      window.location.hash = '#/login';
    }
  }

  function getToken() {
    if (typeof Auth !== 'undefined' && Auth.getToken) return Auth.getToken();
    return localStorage.getItem(TOKEN_KEY);
  }

  function queryString(params) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.append(key, value);
    });
    const qs = search.toString();
    return qs ? `?${qs}` : '';
  }

  const api = {
    BASE_URL,

    // ─── Auth ─────────────────────────────────────────────────────────────
    login(email, password) {
      return request('POST', '/auth/login', { email, password });
    },

    // ─── Dashboard ────────────────────────────────────────────────────────
    dashboard(year, month) {
      const params = {};
      if (year) params.year = year;
      if (month) params.month = month;
      return request('GET', `/dashboard${queryString(params)}`);
    },

    // ─── Clients ──────────────────────────────────────────────────────────
    clients: {
      list(filters = {}) {
        return request('GET', `/clients${queryString({ ...filters, limit: filters.limit || DEFAULT_LIMIT })}`);
      },
      get(id) {
        return request('GET', `/clients/${encodeURIComponent(id)}`);
      },
      create(data) {
        return request('POST', '/clients', data);
      },
      update(id, data) {
        return request('PUT', `/clients/${id}`, data);
      },
      deactivate(id) {
        return request('POST', `/clients/${id}/deactivate`);
      },
      renewAccess(id, newLimit) {
        return request('POST', `/clients/${id}/access-renewal`, { newLimit });
      },
      lastAttendance(id) {
        return request('GET', `/clients/${id}/last-attendance`);
      },
      subscription(id) {
        return request('GET', `/clients/${encodeURIComponent(id)}/subscription`);
      }
    },

    // ─── Subscriptions ────────────────────────────────────────────────────
    subscriptions: {
      create(data) {
        return request('POST', '/subscriptions', data);
      }
    },

    // ─── Payments ─────────────────────────────────────────────────────────
    payments: {
      list(filters = {}) {
        return request('GET', `/payments${queryString({ ...filters, limit: filters.limit || DEFAULT_LIMIT })}`);
      },
      create(data) {
        return request('POST', '/payments', data);
      }
    },

    // ─── Plans ────────────────────────────────────────────────────────────
    plans: {
      list() {
        return request('GET', '/plans');
      },
      get(id) {
        return request('GET', `/plans/${encodeURIComponent(id)}`);
      },
      create(data) {
        return request('POST', '/plans', data);
      }
    },

    // ─── Freezes ──────────────────────────────────────────────────────────
    freezes: {
      create(data) {
        return request('POST', '/freezes', data);
      },
      unfreeze(id) {
        return request('POST', `/freezes/${id}/unfreeze`);
      }
    },

    // ─── Releases ─────────────────────────────────────────────────────────
    releases: {
      create(data) {
        return request('POST', '/releases', data);
      }
    },

    // ─── Attendances ──────────────────────────────────────────────────────
    attendances: {
      create(data) {
        return request('POST', '/attendances', data);
      }
    },

    // ─── Units (Gym) ──────────────────────────────────────────────────────
    units: {
      list() {
        return request('GET', '/units');
      },
      create(data) {
        return request('POST', '/units', data);
      }
    },

    // ─── Terminals ────────────────────────────────────────────────────────
    terminals: {
      list(unitId) {
        return request('GET', `/terminals${queryString({ unitId })}`);
      },
      create(data) {
        return request('POST', '/terminals', data);
      }
    },

    // ─── Access Events (Histórico de Acessos) ─────────────────────────────
    accessEvents: {
      list(filters = {}) {
        return request('GET', `/access-events${queryString({ ...filters, limit: filters.limit || 50 })}`);
      },
      create(data) {
        return request('POST', '/access-events', data);
      }
    }
  };

  return api;
})();

if (typeof window !== 'undefined') window.API = API;
if (typeof globalThis !== 'undefined') globalThis.API = API;