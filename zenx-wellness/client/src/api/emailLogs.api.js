import { axiosClient } from './axiosClient';

// params: { status? } — admin only.
export const listEmailLogsRequest = (params) => axiosClient.get('/emails', { params }).then((r) => r.data);

export const getEmailLogRequest = (id) => axiosClient.get(`/emails/${id}`).then((r) => r.data);

// Only ever valid on a 'failed' row — see emailLog.controller.js#resendEmail.
export const resendEmailLogRequest = (id) => axiosClient.post(`/emails/${id}/resend`).then((r) => r.data);
