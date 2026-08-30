import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUserRequest, listUsersRequest, updateMeRequest, updateUserRequest } from '../api/users.api';

// Admin-only: the full user directory, optionally filtered by role.
export function useUsers(filter) {
  return useQuery({ queryKey: ['users', 'all', filter ?? {}], queryFn: () => listUsersRequest(filter) });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUserRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...patch }) => updateUserRequest(userId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

// Client-only: choose (or change) the dietitian they work with.
export function useSelectDietitian() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignedDietitian) => updateMeRequest({ assignedDietitian }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

// Dietitian-only: sets the IANA zone their weekly hours/exceptions are interpreted in (spec
// §2026-round2-fixes item 7). Callers should also feed the returned user into
// useAuth().updateUser so AuthContext stays in sync without a reload.
export function useUpdateTimezone() {
  return useMutation({ mutationFn: (timezone) => updateMeRequest({ timezone }) });
}

// Any role: timezone/country/dateFormat/timeFormat together (PreferencesFields.jsx). Callers should
// also feed the returned user into useAuth().updateUser so AuthContext stays in sync without a
// reload — same convention as useUpdateTimezone above.
export function useUpdatePreferences() {
  return useMutation({ mutationFn: (patch) => updateMeRequest(patch) });
}
