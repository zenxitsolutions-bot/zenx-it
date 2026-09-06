import { axiosClient } from './axiosClient';

// params: { activeOnly? } — admin sees every plan by default; pass activeOnly:true for a
// create/edit-client dropdown so an inactive plan isn't offered. Dietitian requests are always
// scoped to active-only server-side.
export const listProgramPlansRequest = (params) => axiosClient.get('/program-plans', { params }).then((r) => r.data);

// { name, description? } — admin only.
export const createProgramPlanRequest = (payload) => axiosClient.post('/program-plans', payload).then((r) => r.data);

// patch: { name?, description?, active? } — admin only.
export const updateProgramPlanRequest = (planId, patch) =>
  axiosClient.patch(`/program-plans/${planId}`, patch).then((r) => r.data);
