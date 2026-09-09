import { axiosClient } from './axiosClient';

export const listNotificationsRequest = () => axiosClient.get('/notifications').then((r) => r.data);

export const markNotificationReadRequest = (id) =>
  axiosClient.post(`/notifications/${id}/read`).then((r) => r.data);

export const markAllNotificationsReadRequest = () =>
  axiosClient.post('/notifications/read-all').then((r) => r.data);
