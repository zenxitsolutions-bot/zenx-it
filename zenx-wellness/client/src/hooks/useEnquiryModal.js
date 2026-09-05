import { useContext } from 'react';
import { EnquiryContext } from '../context/EnquiryContext';

export function useEnquiryModal() {
  const ctx = useContext(EnquiryContext);
  if (!ctx) throw new Error('useEnquiryModal must be used within an EnquiryProvider');
  return ctx;
}
