import {
  listNotificationsForUser,
  findNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
} from '../models/Notification.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const items = await listNotificationsForUser(req.user.id);
  res.json(items.map((item) => toClientShape(item)));
});

export const readNotification = asyncHandler(async (req, res) => {
  const existing = await findNotificationById(req.params.id);
  if (!existing || existing.user !== req.user.id) throw ApiError.notFound('Notification not found');
  const item = await markNotificationRead(req.params.id, req.user.id);
  res.json(toClientShape(item));
});

export const readAllNotifications = asyncHandler(async (req, res) => {
  await markAllNotificationsRead(req.user.id);
  res.status(204).send();
});
