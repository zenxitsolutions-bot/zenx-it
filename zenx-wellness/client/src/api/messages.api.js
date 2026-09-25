import { axiosClient } from './axiosClient';

// client is required for a dietitian; before/after are opaque server cursors, never offsets.
export const listMessagesRequest = (params, signal) => axiosClient.get('/messages', { params, signal }).then((r) => r.data);

export const sendMessageRequest = (payload) => axiosClient.post('/messages', payload).then((r) => r.data);

export const markMessagesReadRequest = (payload) => axiosClient.post('/messages/read', payload).then((r) => r.data);

export const getUnreadMessageCountRequest = (params, signal) =>
  axiosClient.get('/messages/unread-count', { params, signal }).then((r) => r.data);

// Dietitian only — one row per assigned client.
export const listConversationsRequest = (signal) => axiosClient.get('/messages/conversations', { signal }).then((r) => r.data);
