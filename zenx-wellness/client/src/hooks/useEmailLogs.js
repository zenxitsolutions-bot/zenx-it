import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listEmailLogsRequest, resendEmailLogRequest } from '../api/emailLogs.api';

export function useEmailLogs(params) {
  return useQuery({ queryKey: ['emailLogs', params ?? {}], queryFn: () => listEmailLogsRequest(params) });
}

export function useResendEmailLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resendEmailLogRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emailLogs'] }),
  });
}
