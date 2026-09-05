import { axiosClient } from './axiosClient';

export const getMyCompanyRequest = () => axiosClient.get('/company/me').then((r) => r.data.company);

// Unauthenticated — the slug-scoped login page renders a tenant's name before anyone has a token.
export const getPublicCompanyRequest = (slug) =>
  axiosClient.get(`/company/public/${encodeURIComponent(slug)}`).then((r) => r.data.company);
