import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createEnquiry as createEnquiryRecord,
  listEnquiries as queryEnquiries,
  findEnquiryById,
  updateEnquiryPatch,
  updateEnquiryStatus,
} from '../models/Enquiry.js';
import { createAuditLog } from '../models/AuditLog.js';
import { createNotification } from '../models/Notification.js';
import { findCompanyByEnquiryId, updateCompanyStatus } from '../models/Company.js';
import { listApplicationAccessForCompany, updateApplicationAccessStatus } from '../models/ApplicationAccess.js';
import { syncWellnessCompanyStatus } from '../models/WellnessDb.js';
import { sendNewEnquiryEmail } from '../emails/sendNewEnquiryEmail.js';

// Public route (no auth) — the marketing site's contact form. Mirrors the RLS policy this
// replaces: "anon insert allowed only with status='NEW'" — enforced in the model, never trusts a
// status field from the request body at all.
export const createEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await createEnquiryRecord(req.body);
  await createNotification({
    kind: 'NEW_ENQUIRY',
    title: 'New enquiry',
    body: `${enquiry.contact_name} from ${enquiry.company_name}`,
    entityId: enquiry.id,
  });
  try {
    await sendNewEnquiryEmail(enquiry);
  } catch (err) {
    console.error('[createEnquiry] staff notification email failed', err);
  }
  res.status(201).json(enquiry);
});

export const listEnquiries = asyncHandler(async (req, res) => {
  res.json(await queryEnquiries());
});

export const getEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await findEnquiryById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  res.json(enquiry);
});

export const patchEnquiry = asyncHandler(async (req, res) => {
  const existing = await findEnquiryById(req.params.id);
  if (!existing) throw ApiError.notFound('Enquiry not found');
  res.json(await updateEnquiryPatch(req.params.id, req.body));
});

export const updateEnquiryStatusHandler = asyncHandler(async (req, res) => {
  const existing = await findEnquiryById(req.params.id);
  if (!existing) throw ApiError.notFound('Enquiry not found');

  const enquiry = await updateEnquiryStatus(req.params.id, req.body.status);
  await createAuditLog({
    adminId: req.staff.id,
    action: 'UPDATE_ENQUIRY_STATUS',
    entityType: 'enquiry',
    entityId: enquiry.id,
    description: `${existing.status} → ${req.body.status}`,
  });

  // An accidental Converted that is later marked Lost must not leave the provisioned customer
  // Active in ZenX or Nourishly. Only runs when a company was actually created for this enquiry.
  if (existing.status === 'CONVERTED' && req.body.status === 'LOST') {
    try {
      await deactivateConvertedCustomer(enquiry.id);
    } catch (err) {
      console.error('[updateEnquiryStatus] failed to deactivate converted customer', err);
    }
  }

  res.json(enquiry);
});

async function deactivateConvertedCustomer(enquiryId) {
  const company = await findCompanyByEnquiryId(enquiryId);
  if (!company) return;

  if (company.status !== 'INACTIVE') {
    await updateCompanyStatus(company.id, 'INACTIVE');
  }

  const grants = await listApplicationAccessForCompany(company.id);
  for (const grant of grants) {
    if (grant.status === 'ACTIVE') {
      await updateApplicationAccessStatus(grant.id, 'DISABLED');
    }
  }

  try {
    await syncWellnessCompanyStatus({
      zenxCompanyId: company.id,
      slug: company.company_slug,
      status: 'INACTIVE',
    });
  } catch (err) {
    console.error('[deactivateConvertedCustomer] wellness-app status sync failed', err);
  }
}
