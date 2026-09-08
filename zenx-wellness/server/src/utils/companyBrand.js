import { findCompanyById } from '../models/Company.js';

export const DEFAULT_COMPANY_NAME = 'ZenX Dietitian';

export async function companyDisplayName(userOrCompanyId) {
  const id = typeof userOrCompanyId === 'string' ? userOrCompanyId : userOrCompanyId?.companyId;
  if (!id) return DEFAULT_COMPANY_NAME;
  const company = await findCompanyById(id);
  return company?.name?.trim() || DEFAULT_COMPANY_NAME;
}
