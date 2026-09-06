import { createContext, useCallback, useMemo, useState } from 'react';

export const EnquiryContext = createContext(null);

export function EnquiryProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  // Which company's funnel the modal is submitting into. EnquiryModal renders outside the
  // RouterProvider (App.jsx), so it cannot read :companySlug from the URL itself — whoever opens
  // the modal passes the slug it already has from useParams. Undefined keeps the pre-existing
  // behaviour: the server attaches the lead to its configured default company.
  const [companySlug, setCompanySlug] = useState(undefined);

  // Guarded to a string on purpose: `openEnquiry` is passed straight to onClick in places
  // (HomePage), which would otherwise hand a React SyntheticEvent in as the slug and post it.
  const openEnquiry = useCallback((slug) => {
    setCompanySlug(typeof slug === 'string' && slug ? slug : undefined);
    setIsOpen(true);
  }, []);
  // The slug is deliberately left in place on close: it is cleared by the next openEnquiry, and
  // clearing it here would blank the value out from under the modal's closing animation.
  const closeEnquiry = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, companySlug, openEnquiry, closeEnquiry }),
    [isOpen, companySlug, openEnquiry, closeEnquiry]
  );

  return <EnquiryContext.Provider value={value}>{children}</EnquiryContext.Provider>;
}
