import { create } from 'zustand';

const TOKEN_KEY = 'paradigm_jwt';
const REFRESH_KEY = 'paradigm_refresh';
const USER_KEY = 'paradigm_user';

function loadToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}
function loadRefresh() {
  try { return sessionStorage.getItem(REFRESH_KEY) || null; } catch { return null; }
}
function loadUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const useAuthStore = create((set, get) => ({
  token: loadToken(),
  refreshToken: loadRefresh(),
  user: loadUser(),
  isAuthenticated: !!loadToken(),
  loading: false,
  error: null,

  setAuth: (token, user, refreshToken) => {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
    } catch { /* SSR or private browsing */ }
    set({ token, refreshToken: refreshToken || get().refreshToken, user, isAuthenticated: true, error: null });
  },

  // Called by the API interceptor when tokens are refreshed
  setTokens: (token, refreshToken) => {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
    } catch {
      // Ignore storage errors
    }
    set({ token, refreshToken: refreshToken || get().refreshToken });
  },

  logout: () => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch {
      // Ignore storage errors
    }
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false, error: null });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  getToken: () => get().token,
}));
