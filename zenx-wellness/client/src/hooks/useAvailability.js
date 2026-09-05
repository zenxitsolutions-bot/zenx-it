import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWeeklyHoursRequest,
  saveWeeklyHoursRequest,
  listAvailabilityExceptionsRequest,
  createAvailabilityExceptionRequest,
  deleteAvailabilityExceptionRequest,
} from '../api/availability.api';

// dietitianId: omit for "my own hours" (dietitian self-service); pass it when an admin is editing
// a named dietitian's hours (spec §2026-round2-fixes item 2) — same convention as useCalls/
// useProgress's own clientId param.
export function useWeeklyHours(dietitianId) {
  return useQuery({
    queryKey: ['availability', 'weekly-hours', dietitianId ?? 'mine'],
    queryFn: () => getWeeklyHoursRequest(dietitianId),
  });
}

export function useSaveWeeklyHours(dietitianId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (days) => saveWeeklyHoursRequest(days, dietitianId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability', 'weekly-hours'] }),
  });
}

export function useAvailabilityExceptions() {
  return useQuery({ queryKey: ['availability', 'exceptions'], queryFn: listAvailabilityExceptionsRequest });
}

export function useCreateAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAvailabilityExceptionRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability', 'exceptions'] }),
  });
}

export function useDeleteAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAvailabilityExceptionRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability', 'exceptions'] }),
  });
}
