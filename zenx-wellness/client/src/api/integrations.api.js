import { axiosClient } from './axiosClient';

export const getGoogleStatusRequest = () => axiosClient.get('/integrations/google/status').then((r) => r.data);
export const connectGoogleRequest = () => axiosClient.post('/integrations/google/connect').then((r) => r.data);
export const disconnectGoogleRequest = () => axiosClient.delete('/integrations/google').then((r) => r.data);
