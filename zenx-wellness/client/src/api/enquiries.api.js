import { axiosClient } from './axiosClient';

export const createEnquiryRequest = (payload) => axiosClient.post('/enquiries', payload).then((r) => r.data);

export const listEnquiriesRequest = (params) => axiosClient.get('/enquiries', { params }).then((r) => r.data);

export const updateEnquiryRequest = (enquiryId, payload) =>
  axiosClient.patch(`/enquiries/${enquiryId}`, payload).then((r) => r.data);

export const getEnquiryHistoryRequest = (enquiryId) =>
  axiosClient.get(`/enquiries/${enquiryId}/history`).then((r) => r.data);
