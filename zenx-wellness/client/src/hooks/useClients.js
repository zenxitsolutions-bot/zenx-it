import { useQuery } from '@tanstack/react-query';
import { getUserRequest, listUsersRequest } from '../api/users.api';

// Server auto-scopes: dietitian gets only their assigned clients, admin gets everyone.
export function useClients() {
  return useQuery({ queryKey: ['users', 'clients'], queryFn: () => listUsersRequest({ role: 'client' }) });
}

export function useClient(clientId) {
  return useQuery({
    queryKey: ['users', clientId],
    queryFn: () => getUserRequest(clientId),
    enabled: Boolean(clientId),
  });
}

// Server auto-scopes: a client or admin gets the full dietitian directory. A dietitian caller
// gets nothing useful back (the server forces their own assignedDietitian scope instead), so
// callers on that role should pass enabled: false.
export function useDietitians(enabled = true) {
  return useQuery({
    queryKey: ['users', 'dietitians'],
    queryFn: () => listUsersRequest({ role: 'dietitian' }),
    enabled,
  });
}
