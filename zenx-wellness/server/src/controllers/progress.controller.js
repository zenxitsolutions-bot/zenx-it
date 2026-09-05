import {
  listProgress as queryProgress,
  createProgress as createProgressRecord,
  findProgressById,
  updateProgressById,
  deleteProgressById,
} from '../models/Progress.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertDietitianOwnsClient, assertUserInCompany } from '../utils/scope.js';
import { toClientShape } from '../utils/serialize.js';

export const listProgress = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'client') filter.client = req.user.id;
  else if (req.query.client) {
    await assertDietitianOwnsClient(req, req.query.client);
    filter.client = req.query.client;
  } else throw ApiError.badRequest('client query param required');

  const entries = await queryProgress(filter);
  res.json(entries.map((e) => toClientShape(e)));
});

export const createProgress = asyncHandler(async (req, res) => {
  const entry = await createProgressRecord({ ...req.body, client: req.user.id });
  res.status(201).json(toClientShape(entry));
});

export const updateProgress = asyncHandler(async (req, res) => {
  const entry = await findProgressById(req.params.id);
  if (!entry) throw ApiError.notFound('Progress entry not found');
  await assertUserInCompany(req, entry.client);
  if (req.user.role !== 'admin' && String(entry.client) !== req.user.id) throw ApiError.forbidden();

  const updated = await updateProgressById(req.params.id, req.body);
  res.json(toClientShape(updated));
});

export const deleteProgress = asyncHandler(async (req, res) => {
  const entry = await findProgressById(req.params.id);
  if (!entry) throw ApiError.notFound('Progress entry not found');
  await assertUserInCompany(req, entry.client);
  if (req.user.role !== 'admin' && String(entry.client) !== req.user.id) throw ApiError.forbidden();

  await deleteProgressById(req.params.id);
  res.status(204).send();
});
