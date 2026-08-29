import axios from "axios";
import { getStaffAccessToken, setStaffAccessToken, getCustomerAccessToken, setCustomerAccessToken } from "./tokenStore";

// Replaces lib/supabase.ts's live-mode role. isDemoMode keeps the exact same name/shape every
// service file already checks, so those `if (isDemoMode)` branches need zero changes — only what
// happens in the live-mode branch (this file) changed, from supabase-js calls to axios calls.
const baseURL = import.meta.env.VITE_ADMIN_API_URL as string | undefined;
export const isDemoMode = !baseURL;

export const apiClient = axios.create({ baseURL: baseURL || "http://localhost:4001/api", withCredentials: true });

const isCustomerRequest = (url?: string) => Boolean(url?.includes("/customer-auth"));

apiClient.interceptors.request.use((config) => {
  const token = isCustomerRequest(config.url) ? getCustomerAccessToken() : getStaffAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let staffRefreshPromise: Promise<string | null> | null = null;
let customerRefreshPromise: Promise<string | null> | null = null;

const NO_REFRESH_RETRY = ["/auth/refresh", "/auth/login", "/customer-auth/refresh", "/customer-auth/login"];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const skipRetry = NO_REFRESH_RETRY.some((path) => config?.url?.includes(path));
    if (response?.status !== 401 || config._retried || skipRetry) throw error;
    config._retried = true;

    const customer = isCustomerRequest(config.url);
    if (customer) {
      customerRefreshPromise ??= apiClient
        .post("/customer-auth/refresh")
        .then(({ data }) => {
          setCustomerAccessToken(data.accessToken);
          return data.accessToken as string;
        })
        .catch(() => null)
        .finally(() => {
          customerRefreshPromise = null;
        });
      const token = await customerRefreshPromise;
      if (!token) throw error;
      config.headers.Authorization = `Bearer ${token}`;
      return apiClient(config);
    }

    staffRefreshPromise ??= apiClient
      .post("/auth/refresh")
      .then(({ data }) => {
        setStaffAccessToken(data.accessToken);
        return data.accessToken as string;
      })
      .catch(() => null)
      .finally(() => {
        staffRefreshPromise = null;
      });
    const token = await staffRefreshPromise;
    if (!token) throw error;
    config.headers.Authorization = `Bearer ${token}`;
    return apiClient(config);
  }
);
