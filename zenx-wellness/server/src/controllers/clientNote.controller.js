import {
  listClientNotes as queryClientNotes,
  findClientNoteById,
  createClientNote as createClientNoteRecord,
  updateClientNoteById,
  deleteClientNoteById,
} from '../models/ClientNote.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertDietitianOwnsClient, assertUserInCompany } from '../utils/scope.js';
import { toClientShape } from '../utils/serialize.js';

export const listClientNotes = asyncHandler(async (req, res) => {
  if (!req.query.client) throw ApiError.badRequest('client query param required');
  await assertDietitianOwnsClient(req, req.query.client);

  const notes = await queryClientNotes(req.query.client);
  res.json(notes.map((n) => toClientShape(n)));
});

export const createClientNote = asyncHandler(async (req, res) => {
  await assertDietitianOwnsClient(req, req.body.client);

  const note = await createClientNoteRecord({ ...req.body, author: req.user.id });
  res.status(201).json(toClientShape(note));
});

// Author-or-admin only — a dietitian can't edit/delete another dietitian's note about a shared
// (admin-visible) client, matching how per-call notes stay tied to the owning dietitian elsewhere.
export const updateClientNote = asyncHandler(async (req, res) => {
  const note = await findClientNoteById(req.params.id);
  if (!note) throw ApiError.notFound('Note not found');
  await assertUserInCompany(req, note.client);
  if (req.user.role !== 'admin' && String(note.author) !== req.user.id) throw ApiError.forbidden();

  const updated = await updateClientNoteById(req.params.id, req.body);
  res.json(toClientShape(updated));
});

export const deleteClientNote = asyncHandler(async (req, res) => {
  const note = await findClientNoteById(req.params.id);
  if (!note) throw ApiError.notFound('Note not found');
  await assertUserInCompany(req, note.client);
  if (req.user.role !== 'admin' && String(note.author) !== req.user.id) throw ApiError.forbidden();

  await deleteClientNoteById(req.params.id);
  res.status(204).send();
});
