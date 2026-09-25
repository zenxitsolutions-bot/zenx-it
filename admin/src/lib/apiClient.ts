import axios from "axios";
import { getStaffAccessToken, setStaffAccessToken, getCustomerAccessToken, setCustomerAccessToken, getAuthGeneration, getAuthSignal, canRefreshSession } from "./tokenStore";

declare module "axios" { interface AxiosRequestConfig { _authGeneration?: number; } }

// Replaces lib/supabase.ts's live-mode role. isDemoMode keeps the exact same name/shape every
// service file already checks, so those `if (isDemoMode)` branches need zero changes — only what
// happens in the live-mode branch (this file) changed, from supabase-js calls to axios calls.
const configuredURL = import.meta.env.VITE_ADMIN_API_URL as string | undefined;
export const isDemoMode = !configuredURL;

// Every server route is mounted under /api (admin-server/src/app.js), so the base URL must end
// there. Deploys that set VITE_ADMIN_API_URL to the bare host (https://api.example.com) would
// otherwise 404 on every call, and Vite bakes the value in at build time so the mistake only
// shows up in the browser. Tolerate both forms, and a trailing slash, instead.
const normalizeBaseURL = (url: string) => {
  const trimmed = url.replace(/\/+$/, "");
  return /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
};

const baseURL = configuredURL ? normalizeBaseURL(configuredURL) : "http://localhost:4001/api";

export const apiClient = axios.create({ baseURL, withCredentials: true });

const isCustomerRequest = (url?: string) => Boolean(url?.includes("/customer-auth"));

apiClient.interceptors.request.use((config) => {
  const customer = isCustomerRequest(config.url);
  config._authGeneration ??= getAuthGeneration(customer);
  if (config._authGeneration !== getAuthGeneration(customer)) throw new axios.CanceledError('Session changed');
  config.signal ??= getAuthSignal(customer);
  const token = customer ? getCustomerAccessToken() : getStaffAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let staffRefreshPromise: Promise<string | null> | null = null;
let customerRefreshPromise: Promise<string | null> | null = null;
let staffRefreshGeneration: number | null = null;
let customerRefreshGeneration: number | null = null;

// One refresh per realm, shared by startup and 401 retries. Browser Web Locks prevent two tabs
// rotating the same cookie concurrently; the server treats reuse as a potentially stolen token.
export function refreshAccessToken(customer = false): Promise<string | null> {
  if (!canRefreshSession(customer)) return Promise.resolve(null);
  const generation = getAuthGeneration(customer);
  const current = customer ? customerRefreshPromise : staffRefreshPromise;
  if (current && (customer ? customerRefreshGeneration : staffRefreshGeneration) === generation) return current;
  const run = () => apiClient.post<{ accessToken: string }>(customer ? '/customer-auth/refresh' : '/auth/refresh', undefined, { _authGeneration: generation })
    .then(({ data }) => {
      if (!(customer ? setCustomerAccessToken : setStaffAccessToken)(data.accessToken, generation)) throw new axios.CanceledError('Session changed');
      return data.accessToken;
    });
  const pending = Promise.resolve().then(async () => {
    const locks = globalThis.navigator?.locks;
    return locks ? await locks.request(customer ? 'zenx-customer-refresh' : 'zenx-staff-refresh', run) : await run();
  }).catch(() => null).finally(() => {
    if (customer && customerRefreshPromise === pending) customerRefreshPromise = null;
    else if (!customer && staffRefreshPromise === pending) staffRefreshPromise = null;
  });
  if (customer) { customerRefreshPromise = pending; customerRefreshGeneration = generation; }
  else { staffRefreshPromise = pending; staffRefreshGeneration = generation; }
  return pending;
}

const NO_REFRESH_RETRY = ["/auth/refresh", "/auth/login", "/auth/logout", "/auth/forgot-password", "/auth/reset-password", "/customer-auth/refresh", "/customer-auth/login", "/customer-auth/logout"];

apiClient.interceptors.response.use(
  (response) => {
    if (response.config._authGeneration !== getAuthGeneration(isCustomerRequest(response.config.url))) throw new axios.CanceledError('Session changed');
    return response;
  },
  async (error) => {
    const { config, response } = error;
    if (!config || config._authGeneration !== getAuthGeneration(isCustomerRequest(config.url))) throw new axios.CanceledError('Session changed');
    const skipRetry = NO_REFRESH_RETRY.some((path) => config?.url?.includes(path));
    if (response?.status !== 401 || config._retried || skipRetry) throw error;
    config._retried = true;

    const customer = isCustomerRequest(config.url);
    const token = await refreshAccessToken(customer);
    if (!token) throw error;
    config.headers.Authorization = `Bearer ${token}`;
    return apiClient(config);
  }
);
