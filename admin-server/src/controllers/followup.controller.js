import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createFollowup as createFollowupRecord,
  listFollowups,
  listFollowupsForEnquiry,
  findFollowupById,
  updateFollowup,
} from '../models/Followup.js';

export const createFollowup = asyncHandler(async (req, res) => {
  res.status(201).json(await createFollowupRecord(req.body));
});

export const getFollowups = asyncHandler(async (req, res) => {
  if (req.query.enquiryId) return res.json(await listFollowupsForEnquiry(req.query.enquiryId));
  res.json(await listFollowups());
});

export const patchFollowup = asyncHandler(async (req, res) => {
  const existing = await findFollowupById(req.params.id);
  if (!existing) throw ApiError.notFound('Follow-up not found');
  res.json(await updateFollowup(req.params.id, req.body));
});
