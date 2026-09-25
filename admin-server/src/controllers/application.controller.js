import { asyncHandler } from '../middleware/asyncHandler.js';
import { listApplications, updateApplicationUrl } from '../models/Application.js';
import { toPublicApplication } from '../utils/publicAccount.js';

export const getApplications = asyncHandler(async (req, res) => {
  res.json((await listApplications()).map(toPublicApplication));
});

export const patchApplicationUrl = asyncHandler(async (req, res) => {
  res.json(toPublicApplication(await updateApplicationUrl(req.params.id, req.body.url)));
});
