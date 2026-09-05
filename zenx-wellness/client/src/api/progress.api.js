import { axiosClient } from './axiosClient';

// params: { client? } — required for dietitian/admin callers, omitted for "my own" (client role).
export const listProgressRequest = (params) => axiosClient.get('/progress', { params }).then((r) => r.data);

export const createProgressRequest = (payload) => axiosClient.post('/progress', payload).then((r) => r.data);
