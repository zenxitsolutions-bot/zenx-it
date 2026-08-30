import {
  listCalls as queryCalls,
  findCallById,
  deleteCallById,
} from '../models/Call.js';
import { findUserById } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertUserInCompany } from '../utils/scope.js';
import { toClientShape } from '../utils/serialize.js';
import { getAvailableSlotsForDay } from '../services/availabilityGuard.js';
import { bookCall, applyCallUpdate } from '../services/callService.js';

function scopeToOwner(req, filter = {}) {
  if (req.user.role === 'client') filter.client = req.user.id;
  else if (req.user.role === 'dietitian') filter.dietitian = req.user.id;
  return filter;
}

export const listCalls = asyncHandler(async (req, res) => {
  const filter = scopeToOwner(req, { companyId: req.user.companyId });
  // Narrows further to one client. Safe even for a dietitian passing an unrelated client id —
  // `filter.dietitian` from scopeToOwner is still ANDed in, so it can only ever return zero rows,
  // never someone else's calls.
  if (req.query.client && req.user.role !== 'client') filter.client = req.query.client;
  if (req.query.from) filter.from = new Date(req.query.from);
  if (req.query.to) filter.to = new Date(req.query.to);

  const calls = await queryCalls(filter);
  res.json(calls.map((c) => toClientShape(c, ['googleEventId'])));
});

// GET /calls/available-slots?date=&dietitian=&excludeCallId= — dietitian resolution mirrors
// createCall: client is scoped to their own assignedDietitian, dietitian to themself, admin must
// supply ?dietitian= explicitly.
export const getAvailableSlots = asyncHandler(async (req, res) => {
  let dietitianId;
  if (req.user.role === 'client') {
    const me = await findUserById(req.user.id);
    if (!me.assignedDietitian) {
      throw ApiError.badRequest('No dietitian assigned yet — contact support to get set up.');
    }
    dietitianId = String(me.assignedDietitian);
  } else if (req.user.role === 'dietitian') {
    dietitianId = req.user.id;
  } else {
    if (!req.query.dietitian) throw ApiError.badRequest('dietitian is required');
    await assertUserInCompany(req, req.query.dietitian);
    dietitianId = req.query.dietitian;
  }

  const slots = await getAvailableSlotsForDay({
    dietitianId,
    date: req.query.date,
    excludeCallId: req.query.excludeCallId,
  });
  res.json({ slots });
});

export const createCall = asyncHandler(async (req, res) => {
  let { client, dietitian, scheduledAt, notes, reminderMinutesBefore } = req.body;

  if (req.user.role === 'client') {
    const me = await findUserById(req.user.id);
    if (!me.assignedDietitian) {
      throw ApiError.badRequest('No dietitian assigned yet — contact support to get set up.');
    }
    client = req.user.id;
    dietitian = String(me.assignedDietitian);
  } else if (req.user.role === 'dietitian') {
    if (!client) throw ApiError.badRequest('client is required');
    dietitian = req.user.id;
  } else {
    if (!client || !dietitian) throw ApiError.badRequest('client and dietitian are required');
    // Admin picking an arbitrary client/dietitian pair — same cross-org guard as plan.controller.js#createPlan.
    await assertUserInCompany(req, client);
    await assertUserInCompany(req, dietitian);
  }

  // Clients can never force — see the `force` comment in call.schema.js.
  const force = req.user.role !== 'client' && Boolean(req.body.force);

  // Availability check, transaction handling, and the booking-email notification all live in
  // callService.js — the same function enquiry.controller.js's Follow-up flow calls, so a booking
  // can never skip the email just because it came from a different entry point.
  const call = await bookCall({ client, dietitian, scheduledAt, notes, reminderMinutesBefore, force });

  res.status(201).json(toClientShape(call, ['googleEventId']));
});

export const updateCall = asyncHandler(async (req, res) => {
  const call = await findCallById(req.params.id);
  if (!call) throw ApiError.notFound('Call not found');
  await assertUserInCompany(req, call.dietitian?._id ?? call.dietitian);

  const isOwningClient = req.user.role === 'client' && String(call.client) === req.user.id;
  const isOwningDietitian = req.user.role === 'dietitian' && String(call.dietitian?._id ?? call.dietitian) === req.user.id;
  if (req.user.role === 'client' && !isOwningClient) throw ApiError.forbidden();
  if (req.user.role === 'dietitian' && !isOwningDietitian) throw ApiError.forbidden();

  if (isOwningClient) {
    const allowedKeys = new Set(['scheduledAt', 'status', 'reminderMinutesBefore']);
    if (Object.keys(req.body).some((key) => !allowedKeys.has(key))) {
      throw ApiError.forbidden('Clients may only reschedule or cancel a call');
    }
    if (req.body.status && req.body.status !== 'cancelled') {
      throw ApiError.forbidden('Clients may only cancel a call, not mark it complete');
    }
    if (call.status !== 'scheduled') {
      throw ApiError.badRequest('This call can no longer be changed');
    }
  }

  // Clients can never force (see call.schema.js). Reschedule/cancellation transition detection,
  // the .ics SEQUENCE bump, availability re-checking, and the reschedule/cancellation email
  // notifications all live in callService.js now.
  const force = req.user.role !== 'client' && Boolean(req.body.force);
  const updated = await applyCallUpdate(req.params.id, call, req.body, { force });

  res.json(toClientShape(updated, ['googleEventId']));
});

export const deleteCall = asyncHandler(async (req, res) => {
  const existing = await findCallById(req.params.id);
  if (!existing) throw ApiError.notFound('Call not found');
  await assertUserInCompany(req, existing.dietitian?._id ?? existing.dietitian);
  await deleteCallById(req.params.id);
  res.status(204).send();
});
