import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addReportFeedbackRequest, getReportFileRequest, listReportsRequest, uploadReportRequest } from '../api/reports.api';

// clientId scopes to one client's reports; omitted → the caller's own (client role) or all of a
// dietitian's assigned clients' reports (server default, see report.controller.js).
export function useReports(clientId) {
  return useQuery({
    queryKey: ['reports', clientId ?? 'mine'],
    queryFn: () => listReportsRequest(clientId ? { client: clientId } : undefined),
    enabled: clientId !== null,
  });
}

export function useUploadReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadReportRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
}

// enabled: only fetch while the viewer is actually open — a report list can hold many reports,
// and there's no reason to pull every file's bytes just because its card is on screen.
// gcTime: 0 drops the blob from the query cache the moment nothing's observing it (the viewer
// closes/unmounts) rather than keeping potentially-large file bytes cached indefinitely; retry:
// false because a 403/404 won't resolve itself by hitting the same URL again.
export function useReportFile(reportId, enabled) {
  return useQuery({
    queryKey: ['reportFile', reportId],
    queryFn: () => getReportFileRequest(reportId),
    enabled: Boolean(enabled && reportId),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useAddReportFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, ...payload }) => addReportFeedbackRequest(reportId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
}
