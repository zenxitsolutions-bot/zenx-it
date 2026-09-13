import { asyncHandler } from '../middleware/asyncHandler.js';
import { findUserPhoto, saveUserPhoto, deleteUserPhoto } from '../models/UserPhoto.js';
import { profilePhotoMime } from '../utils/profilePhoto.js';

export const getMyPhoto = asyncHandler(async (req, res) => {
  const photo = await findUserPhoto(req.user.id);
  res.set('Cache-Control', 'private, no-store');
  if (!photo) return res.status(204).end();
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'; sandbox");
  res.type(photo.mime_type).send(photo.image);
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
