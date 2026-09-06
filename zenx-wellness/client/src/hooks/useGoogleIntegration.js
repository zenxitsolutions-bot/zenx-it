import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGoogleStatusRequest, connectGoogleRequest, disconnectGoogleRequest } from '@/api/integrations.api';

const KEY = ['integrations', 'google'];

// Only dietitians and admins can host a call, so only they have a Google connection to manage —
// `enabled` keeps the client portal from firing a request that would 403.
export function useGoogleStatus({ enabled = true } = {}) {
  return useQuery({ queryKey: KEY, queryFn: getGoogleStatusRequest, enabled, retry: false });
}

// The server returns Google's consent URL rather than redirecting itself: the redirect has to
// happen as a full top-level navigation, which an XHR cannot do.
export function useConnectGoogle() {
  return useMutation({
    mutationFn: connectGoogleRequest,
    onSuccess: ({ url }) => {
      if (url) window.location.assign(url);
    },
  });
}

export function useDisconnectGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectGoogleRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
