import { axiosClient } from './axiosClient';

export const listCallsRequest = (params) => axiosClient.get('/calls', { params }).then((r) => r.data);

export const getAvailableSlotsRequest = (params) =>
  axiosClient.get('/calls/available-slots', { params }).then((r) => r.data);

export const createCallRequest = (payload) => axiosClient.post('/calls', payload).then((r) => r.data);

export const updateCallRequest = (callId, payload) => axiosClient.patch(`/calls/${callId}`, payload).then((r) => r.data);
