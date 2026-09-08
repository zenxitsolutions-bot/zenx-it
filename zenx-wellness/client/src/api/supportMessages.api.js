import { axiosClient } from './axiosClient';

export const listSupportMessagesRequest = (params) =>
  axiosClient.get('/support-messages', { params }).then((r) => r.data);

export const sendSupportMessageRequest = (payload) =>
  axiosClient.post('/support-messages', payload).then((r) => r.data);

export const markSupportMessagesReadRequest = (payload) =>
  axiosClient.post('/support-messages/read', payload).then((r) => r.data);

export const getSupportUnreadCountRequest = () =>
  axiosClient.get('/support-messages/unread-count').then((r) => r.data);

export const listSupportConversationsRequest = () =>
  axiosClient.get('/support-messages/conversations').then((r) => r.data);
