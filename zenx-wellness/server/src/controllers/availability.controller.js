import { asyncHandler } from '../middleware/asyncHandler.js';
import { listWeeklyHours, replaceWeeklyHours } from '../models/DietitianWeeklyHours.js';
import { listExceptions, createException, deleteExceptionById } from '../models/AvailabilityException.js';
import { findUserById } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

// Exceptions (blocks/extra hours) stay dietitian self-service only — unchanged, out of scope for
// spec §2026-round2-fixes item 2, which only asks for admin-editable *weekly hours*. Weekly hours
// below now also accept an admin caller acting on behalf of a named dietitian — the whole point
// being that this reads/writes the exact same model (DietitianWeeklyHours.js, keyed by
// dietitianId) the booking engine and the dietitian's own self-service screen already use; there
// is no second copy of "working hours" anywhere.
async function resolveDietitianId(req) {
  if (req.user.role !== 'admin') return req.user.id;

  const dietitianId = req.query.dietitian || req.body.dietitian;
  if (!dietitianId) throw ApiError.badRequest('dietitian is required');
  const dietitian = await findUserById(dietitianId);
  if (!dietitian || dietitian.role !== 'dietitian' || dietitian.companyId !== req.user.companyId) {
    throw ApiError.badRequest('Invalid dietitian');
  }
  return dietitianId;
}

export const getWeeklyHours = asyncHandler(async (req, res) => {
  const dietitianId = await resolveDietitianId(req);
  const days = await listWeeklyHours(dietitianId);
  res.json(days.map((day) => toClientShape(day)));
});

export const putWeeklyHours = asyncHandler(async (req, res) => {
  const dietitianId = await resolveDietitianId(req);
  const days = await replaceWeeklyHours(dietitianId, req.body.days);
  res.json(days.map((day) => toClientShape(day)));
});

export const listAvailabilityExceptions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.from) filter.from = new Date(req.query.from);
  if (req.query.to) filter.to = new Date(req.query.to);
  const exceptions = await listExceptions(req.user.id, filter);
  res.json(exceptions.map((exception) => toClientShape(exception)));
});

export const createAvailabilityException = asyncHandler(async (req, res) => {
  const { startAt, endAt, kind, note } = req.body;
  const exception = await createException({ dietitianId: req.user.id, startAt, endAt, kind, note });
  res.status(201).json(toClientShape(exception));
});

export const deleteAvailabilityException = asyncHandler(async (req, res) => {
  const deleted = await deleteExceptionById(req.params.id, req.user.id);
  if (!deleted) throw ApiError.notFound('Exception not found');
  res.status(204).send();
});
