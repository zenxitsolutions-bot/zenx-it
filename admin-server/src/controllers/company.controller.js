import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { listCompanies, findCompanyById, updateCompanyStatus, updateCompanyLogo } from '../models/Company.js';
import { listApplicationAccessForCompany, updateApplicationAccessStatus } from '../models/ApplicationAccess.js';
import { listUsersByIds, updateUserPassword } from '../models/ZenxUser.js';
import { createAuditLog } from '../models/AuditLog.js';
import { hashPassword } from '../utils/password.js';
import {
  syncWellnessCompanyStatus,
  listWellnessClients,
  updateWellnessAssignedDietitian,
  updateWellnessPassword,
} from '../models/WellnessDb.js';

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
  try {
    await syncWellnessCompanyStatus({
      zenxCompanyId: company.id,
      slug: company.company_slug,
      status: company.status,
    });
  } catch (err) {
    console.error('[patchCompanyStatus] wellness-app status sync failed', err);
  }
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

  // Disabling zenx-dietitian access must also lock the mirrored Nourishly company; restoring it
  // only reactivates Nourishly when the ZenX company itself is still ACTIVE.
  if (grant.application === 'zenx-dietitian') {
    try {
      const company = await findCompanyById(grant.company_id);
      const nextStatus = grant.status === 'ACTIVE' && company?.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
      await syncWellnessCompanyStatus({
        zenxCompanyId: grant.company_id,
        slug: company?.company_slug,
        status: nextStatus,
      });
    } catch (err) {
      console.error('[patchApplicationAccessStatus] wellness-app status sync failed', err);
    }
  }

  res.json(grant);
});

export const getWellnessClients = asyncHandler(async (req, res) => {
  const company = await findCompanyById(req.params.id);
  if (!company) throw ApiError.notFound('Company not found');
  try {
    res.json(await listWellnessClients(company.id, company.company_slug));
  } catch (err) {
    console.error('[getWellnessClients] wellness-app lookup failed', err);
    res.json({ clients: [], dietitians: [] });
  }
});

export const patchWellnessDietitian = asyncHandler(async (req, res) => {
  const company = await findCompanyById(req.params.id);
  if (!company) throw ApiError.notFound('Company not found');
  const client = await updateWellnessAssignedDietitian({
    zenxCompanyId: company.id,
    slug: company.company_slug,
    userId: req.params.userId,
    dietitianId: req.body.dietitianId ?? null,
  });
  if (!client) throw ApiError.notFound('Nourishly client not found');
  await createAuditLog({
    adminId: req.staff.id,
    action: 'SET_NOURISHLY_DIETITIAN',
    entityType: 'company',
    entityId: company.id,
    description: `Assigned dietitian ${req.body.dietitianId || 'none'} to ${client.email}`,
  });
  res.json(client);
});

export const setCustomerPassword = asyncHandler(async (req, res) => {
  const passwordHash = await hashPassword(req.body.password);
  const user = await updateUserPassword(req.params.userId, passwordHash, true);
  await createAuditLog({
    adminId: req.staff.id,
    action: 'SET_CUSTOMER_PASSWORD',
    entityType: 'user',
    entityId: user.id,
    description: 'Password reset by admin',
  });
  try {
    await updateWellnessPassword({
      zenxUserId: user.id,
      email: user.email,
      passwordHash,
      mustChangePassword: true,
    });
  } catch (err) {
    console.error('[setCustomerPassword] wellness-app password sync failed', err);
  }
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
