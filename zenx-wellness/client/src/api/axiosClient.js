import axios from 'axios';
import { getAccessToken, setAccessToken, getAuthGeneration, getAuthSignal, canRefreshSession } from './tokenStore';
import { notifyPasswordChangeRequired, notifySessionEnded } from './authEvents';

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
  config._authGeneration ??= getAuthGeneration();
  if (config._authGeneration !== getAuthGeneration()) throw new axios.CanceledError('Session changed');
  config.signal ??= getAuthSignal();
  if (PUBLIC_AUTH.some((path) => config?.url?.includes(path))) {
    if (config.headers) delete config.headers.Authorization;
    return config;
  }
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;
let refreshGeneration = null;

// Bootstrap and 401 retries must share one in-flight refresh. Web Locks also serialize tabs
// sharing the HttpOnly cookie so normal parallel use is not mistaken for token replay.
export function refreshAccessToken() {
  if (!canRefreshSession()) return Promise.reject(new axios.CanceledError('Session is signed out'));
  const generation = getAuthGeneration();
  if (refreshPromise && refreshGeneration === generation) return refreshPromise;
  const run = () => axiosClient.post('/auth/refresh', undefined, { _authGeneration: generation }).then(({ data }) => {
    if (!setAccessToken(data.accessToken, generation)) throw new axios.CanceledError('Session changed');
    return data.accessToken;
  });
  const pending = Promise.resolve().then(() => {
    const locks = globalThis.navigator?.locks;
    return locks ? locks.request('zenx-wellness-refresh', run) : run();
  }).catch((error) => {
    if (generation === getAuthGeneration() && error.response?.status === 401) notifySessionEnded();
    throw error;
  }).finally(() => { if (refreshPromise === pending) refreshPromise = null; });
  refreshGeneration = generation;
  refreshPromise = pending;
  return pending;
}

// Requests to these endpoints must never trigger a refresh-and-retry: retrying /auth/refresh
// itself on its own 401 would await a promise that awaits itself and hang forever, and a 401
// from /auth/login is a real credentials failure, not a stale token.
const NO_REFRESH_RETRY = [...PUBLIC_AUTH, '/auth/logout'];

axiosClient.interceptors.response.use(
  (response) => {
    if (response.config._authGeneration !== getAuthGeneration()) throw new axios.CanceledError('Session changed');
    return response;
  },
  async (error) => {
    const { config, response } = error;
    if (!config || config._authGeneration !== getAuthGeneration()) throw new axios.CanceledError('Session changed');
    if (response?.status === 403 && response.data?.error === 'Password change required before continuing') {
      notifyPasswordChangeRequired();
    }
    const skipRetry = NO_REFRESH_RETRY.some((path) => config?.url?.includes(path));
    if (response?.status !== 401 || skipRetry) throw error;
    if (config._retried) { notifySessionEnded(); throw error; }
    config._retried = true;

    const token = await refreshAccessToken().catch(() => null);
    if (!token) throw error;

    config.headers.Authorization = `Bearer ${token}`;
    return axiosClient(config);
  }
);
