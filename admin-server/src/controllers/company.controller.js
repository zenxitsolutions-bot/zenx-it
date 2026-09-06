import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { listCompanies, findCompanyById, updateCompanyStatus, updateCompanyLogo, updateCompany } from '../models/Company.js';
import { listApplicationAccessForCompany, updateApplicationAccessStatus } from '../models/ApplicationAccess.js';
import { listUsersByIds, updateUserPassword, findUserByEmail, updateUserProfile } from '../models/ZenxUser.js';
import { createAuditLog } from '../models/AuditLog.js';
import { hashPassword } from '../utils/password.js';
import {
  syncWellnessCompanyStatus,
  syncWellnessCompanyLogo,
  syncWellnessCompanyProfile,
  syncWellnessContact,
  listWellnessClients,
  listWellnessLastLoginsByZenxIds,
  updateWellnessAssignedDietitian,
  updateWellnessPassword,
} from '../models/WellnessDb.js';

// Logos are stored as a path relative to this server's own origin, which the admin portal renders
// same-origin. wellness-app is a separate origin, so anything mirrored there has to be absolute.
function absoluteLogoUrl(req, logoPath) {
  return logoPath ? `${req.protocol}://${req.get('host')}${logoPath}` : null;
}

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

function laterIso(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a) >= new Date(b) ? a : b;
}

function withoutPassword(user) {
  if (!user) return user;
  const { password_hash, ...rest } = user;
  return rest;
}

export const getCompanyUsers = asyncHandler(async (req, res) => {
  const grants = await listApplicationAccessForCompany(req.params.id);
  const userIds = [...new Set(grants.map((g) => g.user_id))];
  const users = (await listUsersByIds(userIds)).map(withoutPassword);
  try {
    const wellnessLogins = await listWellnessLastLoginsByZenxIds(userIds);
    for (const user of users) {
      user.last_login = laterIso(user.last_login, wellnessLogins.get(user.id) ?? null);
    }
  } catch (err) {
    console.error('[getCompanyUsers] wellness last-login lookup failed', err);
  }
  res.json(users);
});

function blankToNull(value) {
  if (value === undefined) return undefined;
  if (value === '') return null;
  return value;
}

export const patchCompany = asyncHandler(async (req, res) => {
  const company = await findCompanyById(req.params.id);
  if (!company) throw ApiError.notFound('Company not found');

  const { contact, ...companyPatch } = req.body;
  const nextCompany = await updateCompany(company.id, {
    companyName: companyPatch.companyName,
    companyEmail: blankToNull(companyPatch.companyEmail),
    companyPhone: blankToNull(companyPatch.companyPhone),
    website: blankToNull(companyPatch.website),
    addressLine1: blankToNull(companyPatch.addressLine1),
    addressLine2: blankToNull(companyPatch.addressLine2),
    city: blankToNull(companyPatch.city),
    state: blankToNull(companyPatch.state),
    zip: blankToNull(companyPatch.zip),
    country: blankToNull(companyPatch.country),
    status: companyPatch.status,
    subscriptionPlan: companyPatch.subscriptionPlan,
  });

  if (companyPatch.status && companyPatch.status !== company.status) {
    try {
      await syncWellnessCompanyStatus({
        zenxCompanyId: nextCompany.id,
        slug: nextCompany.company_slug,
        status: nextCompany.status,
      });
    } catch (err) {
      console.error('[patchCompany] wellness-app status sync failed', err);
    }
  }

  try {
    await syncWellnessCompanyProfile({
      zenxCompanyId: nextCompany.id,
      slug: nextCompany.company_slug,
      name: nextCompany.company_name,
      website: nextCompany.website,
    });
  } catch (err) {
    console.error('[patchCompany] wellness-app profile sync failed', err);
  }

  if (contact?.userId) {
    const grants = await listApplicationAccessForCompany(company.id);
    if (!grants.some((g) => g.user_id === contact.userId)) {
      throw ApiError.forbidden('That person does not belong to this company.');
    }
    if (contact.email) {
      const existing = await findUserByEmail(contact.email);
      if (existing && existing.id !== contact.userId) {
        throw ApiError.conflict('Another account already uses that email.');
      }
    }
    const updatedUser = await updateUserProfile(contact.userId, {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: blankToNull(contact.phone),
      jobTitle: blankToNull(contact.jobTitle),
    });
    try {
      await syncWellnessContact({
        zenxUserId: updatedUser.id,
        name: `${updatedUser.first_name} ${updatedUser.last_name}`.trim(),
        email: updatedUser.email,
        phone: updatedUser.phone,
      });
    } catch (err) {
      console.error('[patchCompany] wellness-app contact sync failed', err);
    }
  }

  await createAuditLog({
    adminId: req.staff.id,
    action: 'UPDATE_COMPANY',
    entityType: 'company',
    entityId: nextCompany.id,
    description: `Updated ${nextCompany.company_name}`,
  });
  res.json(nextCompany);
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
  try {
    await syncWellnessCompanyLogo({
      zenxCompanyId: company.id,
      slug: company.company_slug,
      logoUrl: absoluteLogoUrl(req, logoUrl),
    });
  } catch (err) {
    console.error('[uploadLogo] wellness-app logo sync failed', err);
  }
  res.json(company);
});

export const removeLogo = asyncHandler(async (req, res) => {
  const company = await updateCompanyLogo(req.params.id, null);
  try {
    await syncWellnessCompanyLogo({
      zenxCompanyId: company.id,
      slug: company.company_slug,
      logoUrl: null,
    });
  } catch (err) {
    console.error('[removeLogo] wellness-app logo sync failed', err);
  }
  res.json(company);
});
