import axios from 'axios';
import { getAccessToken, setAccessToken } from './tokenStore';

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
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
