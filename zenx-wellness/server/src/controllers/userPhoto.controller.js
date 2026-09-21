import { asyncHandler } from '../middleware/asyncHandler.js';
import { findUserPhoto, saveUserPhoto, deleteUserPhoto } from '../models/UserPhoto.js';
import { findUserById } from '../models/User.js';
import { hasCallBetween } from '../models/Call.js';
import { profilePhotoMime } from '../utils/profilePhoto.js';
import { ApiError } from '../utils/ApiError.js';

async function sendPhoto(userId, res) {
  const photo = await findUserPhoto(userId);
  res.set('Cache-Control', 'private, no-store');
  if (!photo) return res.status(204).end();
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'; sandbox");
  res.type(photo.mime_type).send(photo.image);
}

export const getMyPhoto = asyncHandler(async (req, res) => {
  await sendPhoto(req.user.id, res);
});

export const getUserPhoto = asyncHandler(async (req, res) => {
  const target = await findUserById(req.params.id);
  // Check the tenant before reading photo bytes or revealing whether a photo exists.
  if (!target || !req.user.companyId || target.companyId !== req.user.companyId) {
    throw ApiError.notFound('User not found');
  }
  if (!['client', 'dietitian'].includes(target.role)) throw ApiError.forbidden();

  let allowed = target.id === req.user.id || req.user.role === 'admin';
  const client = req.user.role === 'client' && target.role === 'dietitian' ? req.user
    : req.user.role === 'dietitian' && target.role === 'client' ? target : null;
  const dietitian = client === req.user ? target : req.user;
  if (!allowed && client) {
    // A reassigned client and former dietitian still see each other in their existing call
    // history. Only that exact pair can use the call relationship to read each other's photo.
    allowed = String(client.assignedDietitian) === dietitian.id
      || await hasCallBetween({ client: client.id, dietitian: dietitian.id, companyId: req.user.companyId });
  }
  if (!allowed) throw ApiError.forbidden();
  await sendPhoto(target.id, res);
});

export const putMyPhoto = asyncHandler(async (req, res) => {
  const mimeType = profilePhotoMime(req.file?.buffer);
  await saveUserPhoto(req.user.id, req.file.buffer, mimeType);
  res.json({ message: 'Profile photo saved.' });
});

export const removeMyPhoto = asyncHandler(async (req, res) => {
  await deleteUserPhoto(req.user.id);
  res.status(204).end();
});
