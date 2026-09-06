import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getConsultationScheduleRequest, saveConsultationScheduleRequest } from '../api/consultationSchedule.api';
import { listCallsRequest } from '../api/calls.api';

// Resolves to { schedule: {...} | null, gaps: [...] } — see
// consultationSchedule.controller.js#getConsultationSchedule.
export function useConsultationSchedule(clientId) {
  return useQuery({
    queryKey: ['consultationSchedule', clientId],
    queryFn: () => getConsultationScheduleRequest(clientId),
    enabled: Boolean(clientId),
  });
}

export function useSaveConsultationSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveConsultationScheduleRequest,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultationSchedule', variables.client] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
  });
}

// The "affected upcoming calls" a schedule edit needs to show before asking whether to regenerate
// — every still-scheduled call this specific schedule already produced. No dedicated endpoint:
// reuses GET /calls' existing consultationScheduleId/status filters (server/src/models/Call.js).
export function useGeneratedUpcomingCalls(clientId, scheduleId) {
  return useQuery({
    queryKey: ['calls', clientId, 'consultationSchedule', scheduleId],
    queryFn: () => listCallsRequest({ client: clientId, consultationScheduleId: scheduleId, status: 'scheduled' }),
    enabled: Boolean(clientId && scheduleId),
  });
}
