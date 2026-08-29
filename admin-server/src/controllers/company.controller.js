import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { listCompanies, findCompanyById, updateCompanyStatus, updateCompanyLogo } from '../models/Company.js';
import { listApplicationAccessForCompany, updateApplicationAccessStatus } from '../models/ApplicationAccess.js';
import { listUsersByIds, updateUserPassword } from '../models/ZenxUser.js';
import { createAuditLog } from '../models/AuditLog.js';
import { hashPassword } from '../utils/password.js';

export const getCompanies = asyncHandler(async (req, res) => {
  res.json(await listCompanies());
});

export const getCompany = asyncHandler(async (req, res) => {
  const company = await findCompanyById(req.params.id);
  if (!company) throw ApiError.notFound('Company not found');
  res.json(company);
});

export const getCompanyApplicationAccess = asyncHandler(async (req, res) => {
  res.json(await listApplicationAccessForCompany(req.params.id));
});

export const getCompanyUsers = asyncHandler(async (req, res) => {
  const grants = await listApplicationAccessForCompany(req.params.id);
  const userIds = [...new Set(grants.map((g) => g.user_id))];
  res.json(await listUsersByIds(userIds));
});

export const patchCompanyStatus = asyncHandler(async (req, res) => {
  const company = await updateCompanyStatus(req.params.id, req.body.status);
  await createAuditLog({
    adminId: req.staff.id,
    action: 'SET_COMPANY_STATUS',
    entityType: 'company',
    entityId: company.id,
    description: `status → ${req.body.status}`,
  });
  res.json(company);
});

export const patchApplicationAccessStatus = asyncHandler(async (req, res) => {
  const grant = await updateApplicationAccessStatus(req.params.grantId, req.body.status);
  if (!grant) throw ApiError.notFound('Grant not found');
  await createAuditLog({
    adminId: req.staff.id,
    action: 'SET_APPLICATION_ACCESS_STATUS',
    entityType: 'application_access',
    entityId: grant.id,
    description: `status → ${req.body.status}`,
  });
  res.json(grant);
});

export const setCustomerPassword = asyncHandler(async (req, res) => {
  const user = await updateUserPassword(req.params.userId, await hashPassword(req.body.password), true);
  await createAuditLog({
    adminId: req.staff.id,
    action: 'SET_CUSTOMER_PASSWORD',
    entityType: 'user',
    entityId: user.id,
    description: 'Password reset by admin',
  });
  res.json({ ok: true });
});

export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const logoUrl = `/uploads/company-logos/${req.file.filename}`;
  const company = await updateCompanyLogo(req.params.id, logoUrl);
  res.json(company);
});

export const removeLogo = asyncHandler(async (req, res) => {
  res.json(await updateCompanyLogo(req.params.id, null));
});
