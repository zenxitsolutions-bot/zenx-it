import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProgressRequest, listProgressRequest } from '../api/progress.api';

// clientId omitted → "my own progress" (client role, server auto-scopes to self).
export function useProgress(clientId) {
  return useQuery({
    queryKey: ['progress', clientId ?? 'me'],
    queryFn: () => listProgressRequest(clientId ? { client: clientId } : undefined),
    enabled: clientId !== null,
  });
}

export function useCreateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProgressRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['progress'] }),
  });
}
