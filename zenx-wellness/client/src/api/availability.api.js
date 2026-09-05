import { axiosClient } from './axiosClient';

// dietitianId: omit for "my own hours" (dietitian self-service); pass it when an admin is editing
// a named dietitian's hours (spec §2026-round2-fixes item 2) — the server ignores it for a
// dietitian caller, who can only ever mean themselves.
export const getWeeklyHoursRequest = (dietitianId) =>
  axiosClient.get('/availability/weekly-hours', { params: dietitianId ? { dietitian: dietitianId } : undefined }).then((r) => r.data);

export const saveWeeklyHoursRequest = (days, dietitianId) =>
  axiosClient.put('/availability/weekly-hours', { days, dietitian: dietitianId }).then((r) => r.data);

export const listAvailabilityExceptionsRequest = () => axiosClient.get('/availability/exceptions').then((r) => r.data);

export const createAvailabilityExceptionRequest = (payload) =>
  axiosClient.post('/availability/exceptions', payload).then((r) => r.data);

export const deleteAvailabilityExceptionRequest = (id) =>
  axiosClient.delete(`/availability/exceptions/${id}`).then((r) => r.data);
