import { axiosClient } from './axiosClient';

export const getConsultationScheduleRequest = (clientId) =>
  axiosClient.get('/consultation-schedule', { params: { client: clientId } }).then((r) => r.data);

// payload: { client, frequencyDays, preferredWeekday, preferredTime, startDate, active, regenerateFutureCalls? }
export const saveConsultationScheduleRequest = (payload) =>
  axiosClient.put('/consultation-schedule', payload).then((r) => r.data);
