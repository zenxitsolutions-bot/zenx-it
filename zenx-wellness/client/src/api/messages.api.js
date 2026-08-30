import { axiosClient } from './axiosClient';

// params: { client? } — required for a dietitian, omitted for "my own conversation" (client role).
export const listMessagesRequest = (params) => axiosClient.get('/messages', { params }).then((r) => r.data);

export const sendMessageRequest = (payload) => axiosClient.post('/messages', payload).then((r) => r.data);

export const markMessagesReadRequest = (payload) => axiosClient.post('/messages/read', payload).then((r) => r.data);

export const getUnreadMessageCountRequest = (params) =>
  axiosClient.get('/messages/unread-count', { params }).then((r) => r.data);

// Dietitian only — one row per assigned client.
export const listConversationsRequest = () => axiosClient.get('/messages/conversations').then((r) => r.data);
