import { useMutation } from '@tanstack/react-query';
import { createEnquiryRequest } from '../api/enquiries.api';

export function useCreateEnquiry() {
  return useMutation({ mutationFn: createEnquiryRequest });
}
