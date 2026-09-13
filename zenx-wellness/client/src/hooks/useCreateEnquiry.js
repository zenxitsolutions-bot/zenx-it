import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEnquiryRequest } from '../api/enquiries.api';

export function useCreateEnquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEnquiryRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}
