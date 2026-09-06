import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listProgramPlansRequest, createProgramPlanRequest, updateProgramPlanRequest } from '../api/programPlans.api';

export function useProgramPlans(params) {
  return useQuery({ queryKey: ['programPlans', params ?? {}], queryFn: () => listProgramPlansRequest(params) });
}

export function useCreateProgramPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProgramPlanRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programPlans'] }),
  });
}

export function useUpdateProgramPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, ...patch }) => updateProgramPlanRequest(planId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programPlans'] }),
  });
}
