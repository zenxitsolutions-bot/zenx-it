import axios from 'axios';
import { getAccessToken, setAccessToken } from './tokenStore';
import { notifyPasswordChangeRequired } from './authEvents';

// Every server route is mounted under /api. Tolerate a bare host, a trailing slash, or an
// already-correct /api suffix so a mis-set VITE_API_URL (common across staging/prod) doesn't
// silently 404 every call. In production an unset value is a real config error — do not fall
// back to localhost (that is what made deployed logins appear to "do nothing").
function resolveBaseURL() {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw) {
    if (import.meta.env.PROD) {
      console.error('[api] VITE_API_URL is not set. Login and every other API call will fail.');
      return '/api';
    }
    return 'http://localhost:4000/api';
  }
  const trimmed = String(raw).replace(/\/+$/, '');
  return /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
}

export const getApiBaseURL = resolveBaseURL;

export const axiosClient = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
});

// Public auth calls must never carry a leftover access token. A stale/expired Bearer on
// /auth/login is ignored by Express, but an nginx/API-gateway JWT check in front of the app
// would 401 the login itself and look like "wrong password".
const PUBLIC_AUTH = ['/auth/login', '/auth/refresh', '/auth/handoff', '/auth/forgot-password', '/auth/reset-password'];

axiosClient.interceptors.request.use((config) => {
  if (PUBLIC_AUTH.some((path) => config?.url?.includes(path))) {
    if (config.headers) delete config.headers.Authorization;
    return config;
  }
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

// Requests to these endpoints must never trigger a refresh-and-retry: retrying /auth/refresh
// itself on its own 401 would await a promise that awaits itself and hang forever, and a 401
// from /auth/login is a real credentials failure, not a stale token.
const NO_REFRESH_RETRY = ['/auth/refresh', '/auth/login'];

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 403 && response.data?.error === 'Password change required before continuing') {
      notifyPasswordChangeRequired();
    }
    const skipRetry = NO_REFRESH_RETRY.some((path) => config?.url?.includes(path));
    if (response?.status !== 401 || config._retried || skipRetry) throw error;
    config._retried = true;

    refreshPromise ??= axiosClient
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });

    const token = await refreshPromise.catch(() => null);
    if (!token) throw error;

    config.headers.Authorization = `Bearer ${token}`;
    return axiosClient(config);
  }
);
