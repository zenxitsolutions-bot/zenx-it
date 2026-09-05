import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCallRequest, listCallsRequest, updateCallRequest, getAvailableSlotsRequest } from '../api/calls.api';

const POLL_MS = 20_000; // matches useCallReminders.js's cadence — so a reschedule/booking by one
// party (client or dietitian) becomes visible to the other without a manual reload.

// clientId scopes to one client's calls (used by the client's own detail drawer); omitted →
// the caller's own calls (client role: their calls; dietitian role: calls they're on).
export function useCalls(clientId) {
  return useQuery({
    queryKey: ['calls', clientId ?? 'mine'],
    queryFn: () => listCallsRequest(clientId ? { client: clientId } : undefined),
    enabled: clientId !== null,
    refetchInterval: POLL_MS,
  });
}

export function useCreateCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCallRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calls'] }),
  });
}

export function useUpdateCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ callId, ...payload }) => updateCallRequest(callId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calls'] }),
  });
}

// dietitianId: whose availability to query. excludeCallId: pass the call's own id when
// rescheduling so its current slot doesn't count against itself (see
// server/src/services/availabilityGuard.js#getAvailableSlotsForDay).
export function useAvailableSlots({ dietitianId, date, excludeCallId, timezone }) {
  return useQuery({
    queryKey: ['calls', 'available-slots', dietitianId, date, excludeCallId ?? null, timezone ?? null],
    queryFn: () => getAvailableSlotsRequest({ date, dietitian: dietitianId, excludeCallId, timezone }),
    enabled: Boolean(dietitianId && date),
  });
}
