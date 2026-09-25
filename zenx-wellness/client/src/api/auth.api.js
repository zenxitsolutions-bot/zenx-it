import { axiosClient, refreshAccessToken } from './axiosClient';

export const loginRequest = (payload) => axiosClient.post('/auth/login', payload).then((r) => r.data);
export const handoffRequest = (token, companySlug) =>
  axiosClient.post('/auth/handoff', { token, companySlug: companySlug ?? null }).then((r) => r.data);
export const changePasswordRequest = (payload) => axiosClient.post('/auth/change-password', payload).then((r) => r.data);
export const forgotPasswordRequest = (payload) => axiosClient.post('/auth/forgot-password', payload).then((r) => r.data);
export const resetPasswordRequest = (payload) => axiosClient.post('/auth/reset-password', payload).then((r) => r.data);
export const refreshRequest = () => refreshAccessToken().then((accessToken) => ({ accessToken }));
export const logoutRequest = (accessToken) => axiosClient.post('/auth/logout', undefined, {
  headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
}).then((r) => r.data);
export const meRequest = () => axiosClient.get('/auth/me').then((r) => r.data);
