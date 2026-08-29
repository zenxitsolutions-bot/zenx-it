import { asyncHandler } from '../middleware/asyncHandler.js';
import { listApplications, updateApplicationUrl } from '../models/Application.js';

export const getApplications = asyncHandler(async (req, res) => {
  res.json(await listApplications());
});

export const patchApplicationUrl = asyncHandler(async (req, res) => {
  res.json(await updateApplicationUrl(req.params.id, req.body.url));
});
