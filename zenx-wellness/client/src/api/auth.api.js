import { axiosClient } from './axiosClient';

export const loginRequest = (payload) => axiosClient.post('/auth/login', payload).then((r) => r.data);
export const handoffRequest = (token) => axiosClient.post('/auth/handoff', { token }).then((r) => r.data);
export const changePasswordRequest = (payload) => axiosClient.post('/auth/change-password', payload).then((r) => r.data);
export const forgotPasswordRequest = (payload) => axiosClient.post('/auth/forgot-password', payload).then((r) => r.data);
export const resetPasswordRequest = (payload) => axiosClient.post('/auth/reset-password', payload).then((r) => r.data);
export const refreshRequest = () => axiosClient.post('/auth/refresh').then((r) => r.data);
export const logoutRequest = () => axiosClient.post('/auth/logout').then((r) => r.data);
export const meRequest = () => axiosClient.get('/auth/me').then((r) => r.data);
