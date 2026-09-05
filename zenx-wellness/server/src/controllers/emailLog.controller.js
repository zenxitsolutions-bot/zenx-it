import { listEmailLogs, findEmailLogById, requeueEmail } from '../models/EmailLog.js';
import { findUserById } from '../models/User.js';
import { findCallById } from '../models/Call.js';
import { findEnquiryById } from '../models/Enquiry.js';
import { drainOnce } from '../emails/worker.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

// Mirrors the per-entity-type company resolution in EmailLog.js#listEmailLogs, for the single-row
// by-id routes below (findEmailLogById itself has no company filter).
async function assertOwnEmailLog(req, row) {
  const { type, id } = row.relatedEntity ?? {};
  let companyId = null;
  if (type === 'client') companyId = (await findUserById(id))?.companyId;
  else if (type === 'appointment') {
    const call = await findCallById(id);
    const dietitianId = call?.dietitian?._id ?? call?.dietitian;
    companyId = dietitianId ? (await findUserById(dietitianId))?.companyId : null;
  } else if (type === 'enquiry') companyId = (await findEnquiryById(id))?.companyId;

  if (companyId !== req.user.companyId) throw ApiError.notFound('Email log entry not found');
}

// filter: ?status=queued|sending|sent|failed — omit for all statuses.
export const listEmails = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const rows = await listEmailLogs({ companyId: req.user.companyId, status });
  res.json(rows.map((row) => toClientShape(row)));
});

export const getEmail = asyncHandler(async (req, res) => {
  const row = await findEmailLogById(req.params.id);
  if (!row) throw ApiError.notFound('Email log entry not found');
  await assertOwnEmailLog(req, row);
  res.json(toClientShape(row));
});

// Admin-only manual retry of a permanently-failed send. Only ever allowed from 'failed' — a
// queued/sending row is already going to be picked up by the worker on its own, and a 'sent' row
// resending would be a real duplicate delivery, not a retry.
export const resendEmail = asyncHandler(async (req, res) => {
  const row = await findEmailLogById(req.params.id);
  if (!row) throw ApiError.notFound('Email log entry not found');
  await assertOwnEmailLog(req, row);
  if (row.status !== 'failed') throw ApiError.badRequest(`Only a failed email can be resent (this one is ${row.status})`);

  const requeued = await requeueEmail(req.params.id);
  // Drains immediately rather than waiting for the next poll interval — an admin clicking "Resend"
  // expects it to actually go out now, not silently wait up to EMAIL_QUEUE_POLL_INTERVAL_MS.
  await drainOnce();
  const result = await findEmailLogById(requeued.id);
  res.json(toClientShape(result));
});
