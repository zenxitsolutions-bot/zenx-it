import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listEnquiriesRequest, updateEnquiryRequest, getEnquiryHistoryRequest } from '../api/enquiries.api';

// The kanban board needs every enquiry across all 5 status columns at once — the backend caps
// `limit` at 100, generous for a single clinic's pipeline.
export function useEnquiries() {
  return useQuery({
    queryKey: ['enquiries', 'board'],
    queryFn: () => listEnquiriesRequest({ limit: 100 }),
  });
}

export function useUpdateEnquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ enquiryId, ...payload }) => updateEnquiryRequest(enquiryId, payload),
    onSuccess: (_, { enquiryId }) => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['enquiries', 'history', enquiryId] });
    },
  });
}

export function useEnquiryHistory(enquiryId) {
  return useQuery({
    queryKey: ['enquiries', 'history', enquiryId],
    queryFn: () => getEnquiryHistoryRequest(enquiryId),
    enabled: Boolean(enquiryId),
  });
}
