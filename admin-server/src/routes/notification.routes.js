import { Router } from 'express';
import { authenticateStaff } from '../middleware/authenticate.js';
import { getNotifications, patchNotificationRead, patchAllNotificationsRead } from '../controllers/notification.controller.js';

export const notificationRouter = Router();

notificationRouter.use(authenticateStaff);
notificationRouter.get('/', getNotifications);
notificationRouter.patch('/:id/read', patchNotificationRead);
notificationRouter.patch('/read-all', patchAllNotificationsRead);
