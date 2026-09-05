import { axiosClient } from './axiosClient';

// params: { role? } — dietitian is always auto-scoped server-side to their own assigned clients,
// and a client's request is always forced to role=dietitian (directory browse only).
export const listUsersRequest = (params) => axiosClient.get('/users', { params }).then((r) => r.data);

export const getUserRequest = (userId) => axiosClient.get(`/users/${userId}`).then((r) => r.data);

// { name, email, password, role, assignedDietitian? } — admin only.
export const createUserRequest = (payload) => axiosClient.post('/users', payload).then((r) => r.data);

// patch: { name?, phone?, role?, assignedDietitian? } — admin only.
export const updateUserRequest = (userId, patch) => axiosClient.patch(`/users/${userId}`, patch).then((r) => r.data);

// { password } — admin only. Sets a temporary password and forces a change on next login.
export const resetUserPasswordRequest = (userId, payload) =>
  axiosClient.patch(`/users/${userId}/password`, payload).then((r) => r.data);

// patch: { name?, phone?, assignedDietitian? } — assignedDietitian only settable by clients, for themselves.
export const updateMeRequest = (patch) => axiosClient.patch('/users/me', patch).then((r) => r.data);
