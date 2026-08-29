import { asyncHandler } from '../middleware/asyncHandler.js';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../models/Notification.js';

export const getNotifications = asyncHandler(async (req, res) => {
  res.json(await listNotifications(50));
});

export const patchNotificationRead = asyncHandler(async (req, res) => {
  await markNotificationRead(req.params.id);
  res.status(204).send();
});

export const patchAllNotificationsRead = asyncHandler(async (req, res) => {
  await markAllNotificationsRead();
  res.status(204).send();
});
