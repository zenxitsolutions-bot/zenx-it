import { findConsultationScheduleByClientId } from '../models/ConsultationSchedule.js';
import { findUserById } from '../models/User.js';
import { saveConsultationSchedule, getScheduleGaps } from '../services/consultationScheduleService.js';
import { assertDietitianOwnsClient } from '../utils/scope.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

// Shared by both handlers below: confirms `clientId` is a real client account, then applies the
// same ownership rule plan.controller.js already uses (admin bypasses; a dietitian must be that
// client's assignedDietitian, 403 otherwise) — one rule, reused, not reinvented per resource.
async function assertValidClient(req, clientId) {
  const client = await findUserById(clientId);
  if (!client || client.role !== 'client') throw ApiError.notFound('Client not found');
  await assertDietitianOwnsClient(req, clientId);
  return client;
}

// GET /consultation-schedule?client=<id> — the one shared endpoint's read half, for both the
// creation-flow forms and the Client Settings tab. `gaps` (durable "couldn't be placed" records —
// see consultation_schedule_gaps in schema.sql) rides along here rather than a separate endpoint,
// so the admin view is still just this one resource.
export const getConsultationSchedule = asyncHandler(async (req, res) => {
  const clientId = req.query.client;
  await assertValidClient(req, clientId);
  const schedule = await findConsultationScheduleByClientId(clientId);
  const gaps = schedule ? await getScheduleGaps(schedule.id) : [];
  res.json({ schedule: schedule ? toClientShape(schedule) : null, gaps: gaps.map((gap) => toClientShape(gap)) });
});

// PUT /consultation-schedule — the one shared endpoint's write half. Body always carries `client`
// (never "my own" — neither an admin nor a dietitian ever *is* the client a schedule belongs to).
export const putConsultationSchedule = asyncHandler(async (req, res) => {
  const { client: clientId, ...rest } = req.body;
  await assertValidClient(req, clientId);

  const result = await saveConsultationSchedule({ clientId, ...rest });
  res.json({
    schedule: toClientShape(result.schedule),
    dietitianAssigned: result.dietitianAssigned,
    warning: result.warning,
    generated: result.generated.map((call) => toClientShape(call)),
    gaps: result.gaps,
    cancelled: result.cancelled.map((call) => toClientShape(call)),
  });
});
