import { axiosClient } from './axiosClient';

// params: { client?, week? } — omitted for "my own plans" (client role, server auto-scopes).
export const listPlansRequest = (params) => axiosClient.get('/plans', { params }).then((r) => r.data);

export const createPlanRequest = (payload) => axiosClient.post('/plans', payload).then((r) => r.data);

export const updatePlanRequest = (planId, payload) => axiosClient.patch(`/plans/${planId}`, payload).then((r) => r.data);

export const updateMealStatusRequest = (planId, mealIndex, payload) =>
  axiosClient.patch(`/plans/${planId}/meals/${mealIndex}`, payload).then((r) => r.data);
