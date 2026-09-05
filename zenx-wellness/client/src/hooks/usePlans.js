import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listPlansRequest, createPlanRequest, updatePlanRequest, updateMealStatusRequest } from '../api/plans.api';

// Plans are returned sorted by week desc — the first one is "this week's" plan.
// clientId omitted → "my own plans" (client role, server auto-scopes to self).
export function useCurrentPlan(clientId) {
  const query = useQuery({
    queryKey: ['plans', clientId ?? 'me'],
    queryFn: () => listPlansRequest(clientId ? { client: clientId } : undefined),
    enabled: clientId !== null,
  });
  return { ...query, plan: query.data?.[0] ?? null };
}

// Every plan a client has (not just the current week) — the client profile's meal history can
// span more than one weekly plan document once "last 15 days" crosses a week boundary.
export function useClientPlans(clientId) {
  return useQuery({
    queryKey: ['plans', clientId, 'all'],
    queryFn: () => listPlansRequest({ client: clientId }),
    enabled: Boolean(clientId),
  });
}

// The plan builder needs the plan for one exact week (not just "most recent") — null clientId or
// week disables the query (nothing selected yet in the builder).
export function usePlanForWeek(clientId, week) {
  const query = useQuery({
    queryKey: ['plans', 'week', clientId, week],
    queryFn: () => listPlansRequest({ client: clientId, week }),
    enabled: Boolean(clientId && week),
  });
  return { ...query, plan: query.data?.[0] ?? null };
}

export function useUpdateMealStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, mealIndex, ...payload }) => updateMealStatusRequest(planId, mealIndex, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });
}

// Dietitian/admin: create a brand-new weekly plan for a client.
export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlanRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });
}

// Dietitian/admin: update an existing plan's title/meals/published state (drives autosave).
export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, ...payload }) => updatePlanRequest(planId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  });
}
