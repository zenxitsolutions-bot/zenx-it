import { axiosClient } from './axiosClient';

export const registerDeviceTokenRequest = (payload) =>
  axiosClient.post('/users/me/device-token', payload).then((r) => r.data);

export const unregisterDeviceTokenRequest = (payload) =>
  axiosClient.delete('/users/me/device-token', { data: payload }).then((r) => r.data);
