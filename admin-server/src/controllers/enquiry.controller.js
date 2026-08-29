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
  res.json(enquiry);
});
