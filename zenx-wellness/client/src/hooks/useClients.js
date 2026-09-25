import { useQuery } from '@tanstack/react-query';
import { getUserRequest, listUsersRequest, listDietitianOptionsRequest } from '../api/users.api';

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

// Selector-only records deliberately omit contact and sensitive staff details. Their access
// follows client/call/plan workflows instead of permission to browse full staff accounts.
export function useDietitians(enabled = true) {
  return useQuery({
    queryKey: ['users', 'dietitians'],
    queryFn: listDietitianOptionsRequest,
    enabled,
  });
}
