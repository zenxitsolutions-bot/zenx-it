import {
  createEnquiry as createEnquiryRecord,
  listEnquiries as queryEnquiries,
  countEnquiries,
  findEnquiryById,
  updateEnquiryById,
  deleteEnquiryById,
} from '../models/Enquiry.js';
import { listByEnquiryId, createHistoryEntry } from '../models/EnquiryHistory.js';
import { findUserByEmail, createUser as createUserRecord } from '../models/User.js';
import { reassignEnquiryCallsToClient } from '../models/Call.js';
import { createClientNote } from '../models/ClientNote.js';
import { hashPassword } from '../utils/password.js';
import { withTransaction } from '../db/pool.js';
import { bookCall } from '../services/callService.js';
import { notifyEnquirySubmitted } from '../services/enquiryNotifications.js';
import { notifyClientAccountCreated } from '../services/accountNotifications.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';
import { env } from '../config/env.js';

// Duplicated from client/src/lib/enquiryStatus.js's STATUS_LABEL — this monorepo has no package
// shared between client/ and server/ (see similar duplication comments elsewhere, e.g.
// client/src/lib/availability.js#CALL_DURATION_MINUTES). Only used to prefix a carried-over
// enquiry_history note (below) with something readable, not shown anywhere else server-side.
const STATUS_NOTE_LABEL = {
  new: 'New enquiry',
  contacted: 'Contacted',
  'follow-up': 'Follow-up',
  converted: 'Converted',
  closed: 'Unsuccessful',
};

// Only ever called for the 'converted' transition (spec §2026-round2-fixes item 1 — Follow-up must
// never create an account; only an explicit Converted/Won does). Reuses the exact create-user path
// user.controller.js#createUser already uses (hash the temp password, force a change on first
// login). Must run inside the caller's transaction (conn) so account creation and everything that
// gets carried over onto it either all commit together or none do.
async function createConvertedAccount(enquiry, { planId, planDuration, password }, conn) {
  if (!password || !planId || !planDuration) {
    throw ApiError.badRequest('password, planId, and planDuration are required to create the client account');
  }
  if (await findUserByEmail(enquiry.email)) {
    throw ApiError.conflict('A user with this email is already registered');
  }

  return createUserRecord(
    {
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      passwordHash: await hashPassword(password),
      role: 'client',
      programPlan: planId,
      planDuration,
      mustChangePassword: true,
      companyId: enquiry.companyId,
    },
    conn
  );
}

// Public, unauthenticated — there is one public funnel today, so it always attaches to the
// configured legacy/default company (see env.js#legacyCompanyId's comment). A real per-company
// public funnel (e.g. resolved from a URL slug) is future work, not built here.
export const createEnquiry = asyncHandler(async (req, res) => {
  if (!env.legacyCompanyId) throw new Error('LEGACY_COMPANY_ID is not configured');
  const enquiry = await createEnquiryRecord({ ...req.body, companyId: env.legacyCompanyId });
  await notifyEnquirySubmitted(enquiry);
  res.status(201).json(toClientShape(enquiry));
});

export const listEnquiries = asyncHandler(async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.status) filter.status = req.query.status;

  const page = req.query.page ?? 1;
  const limit = req.query.limit ?? 20;
  const skip = (page - 1) * limit;

  const [enquiries, total] = await Promise.all([
    queryEnquiries(filter, { skip, limit }),
    countEnquiries(filter),
  ]);

  res.json({
    enquiries: enquiries.map((e) => toClientShape(e)),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

// findEnquiryById is a bare by-id lookup (also used mid-transaction elsewhere), so every
// controller entry point re-checks company ownership here — a 404, not 403, so a wrong-company id
// doesn't reveal that the enquiry exists at all.
function assertOwnEnquiry(req, enquiry) {
  if (!enquiry || enquiry.companyId !== req.user.companyId) throw ApiError.notFound('Enquiry not found');
}

export const getEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await findEnquiryById(req.params.id);
  assertOwnEnquiry(req, enquiry);
  res.json(toClientShape(enquiry));
});

// Every transition appends one enquiry_history row (status + note, immutable) — see
// server/src/schemas/enquiry.schema.js for which statuses require a note and why.
//
// 'follow-up' books a real call directly against the ENQUIRY (no client account exists yet — spec
// §2026-round2-fixes item 1). 'converted' — the only transition that ever creates an account — then
// carries that call, and the enquiry's whole history, over onto the new client so they don't start
// with a blank slate. 'new'/'contacted'/'closed' are plain status/note transitions with no side
// effects, same as before.
export const updateEnquiry = asyncHandler(async (req, res) => {
  const existing = await findEnquiryById(req.params.id);
  assertOwnEnquiry(req, existing);

  const { status, note } = req.body;

  if (status === 'follow-up') {
    const { dietitian, scheduledAt } = req.body;
    // Goes through the exact same service call.controller.js#createCall uses (availability check,
    // transaction, AND the booking-email notification to both the dietitian and the enquiry's own
    // contact email) — this used to call the model directly, silently skipping the booking email
    // for every Follow-up call. `enquiry`, not `client`: no account exists to attach this call to
    // yet.
    const call = await bookCall({ enquiry: existing.id, dietitian, scheduledAt, notes: note });
    await createHistoryEntry({ enquiryId: existing.id, status, note: note ?? null, callId: call.id });
    const enquiry = await updateEnquiryById(req.params.id, { status, note });
    return res.json(toClientShape(enquiry));
  }

  if (status === 'converted') {
    const { planId, planDuration, password } = req.body;
    const alreadyConverted = Boolean(existing.convertedUserId);
    // Captured from inside the transaction, but only ever notified about after it commits (below)
    // — never from inside the transaction body itself, so a conversion that ends up rolling back
    // (e.g. the note-copying loop throws) can never have already queued a welcome email for an
    // account that doesn't actually exist.
    let newUser = null;

    // One transaction for the whole conversion: account creation, re-pointing any enquiry-linked
    // calls onto it, copying the enquiry's history into client notes, and the status/history update
    // itself either all happen together or (on any failure) none do — no partial "account exists
    // but its history didn't carry over" state to ever get stuck in or need to detect on retry.
    const enquiry = await withTransaction(async (conn) => {
      let convertedUserId = existing.convertedUserId;

      if (!alreadyConverted) {
        const user = await createConvertedAccount(existing, { planId, planDuration, password }, conn);
        convertedUserId = user.id;
        newUser = user;

        await reassignEnquiryCallsToClient(existing.id, convertedUserId, conn);

        const history = await listByEnquiryId(existing.id, conn);
        for (const entry of history) {
          const label = STATUS_NOTE_LABEL[entry.status] ?? entry.status;
          await createClientNote(
            { client: convertedUserId, author: req.user.id, body: entry.note ? `[${label}] ${entry.note}` : `[${label}]` },
            conn
          );
        }
      }

      await createHistoryEntry({ enquiryId: existing.id, status, note: note ?? null }, conn);
      return updateEnquiryById(req.params.id, { status, note, convertedUserId }, conn);
    });

    if (newUser) await notifyClientAccountCreated(newUser, { plainPassword: password });

    return res.json(toClientShape(enquiry));
  }

  if (status !== 'new') {
    await createHistoryEntry({ enquiryId: existing.id, status, note: note ?? null });
  }
  const enquiry = await updateEnquiryById(req.params.id, { status, note });
  res.json(toClientShape(enquiry));
});

// Admin-only sub-resource — mirrors report.controller.js's feedback pattern. Returns the full,
// immutable timeline for one enquiry (never paginated — a single lead's history stays small).
export const getEnquiryHistory = asyncHandler(async (req, res) => {
  const enquiry = await findEnquiryById(req.params.id);
  assertOwnEnquiry(req, enquiry);
  const history = await listByEnquiryId(req.params.id);
  res.json(history.map((entry) => toClientShape(entry)));
});

export const deleteEnquiry = asyncHandler(async (req, res) => {
  const existing = await findEnquiryById(req.params.id);
  assertOwnEnquiry(req, existing);
  const enquiry = await deleteEnquiryById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  res.status(204).send();
});
