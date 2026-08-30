import { useQuery } from '@tanstack/react-query';
import { getMyCompanyRequest, getPublicCompanyRequest } from '../api/company.api';

// The company record is mirrored from ZenX and only changes when an admin edits it there, so it's
// worth caching for the whole session rather than refetching on every screen that shows branding.
const COMPANY_STALE_TIME = 30 * 60 * 1000;

export function useMyCompany() {
  return useQuery({
    queryKey: ['company', 'me'],
    queryFn: getMyCompanyRequest,
    staleTime: COMPANY_STALE_TIME,
  });
}

export function usePublicCompany(slug) {
  return useQuery({
    queryKey: ['company', 'public', slug],
    queryFn: () => getPublicCompanyRequest(slug),
    enabled: Boolean(slug),
    staleTime: COMPANY_STALE_TIME,
    // A missing/unknown slug is a normal state here (it renders default branding), not an outage
    // worth three retries and a spinner on the login page.
    retry: false,
  });
}
