import { createContext, useCallback, useMemo, useState } from 'react';

export const EnquiryContext = createContext(null);

export function EnquiryProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openEnquiry = useCallback(() => setIsOpen(true), []);
  const closeEnquiry = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ isOpen, openEnquiry, closeEnquiry }), [isOpen, openEnquiry, closeEnquiry]);

  return <EnquiryContext.Provider value={value}>{children}</EnquiryContext.Provider>;
}
