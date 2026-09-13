import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { listNotifications, readNotification, readAllNotifications } from '../controllers/notification.controller.js';

export const notificationRouter = Router();
notificationRouter.use(authenticate, blockIfMustChangePassword);

notificationRouter.get('/', listNotifications);
notificationRouter.post('/read-all', readAllNotifications);
notificationRouter.post('/:id/read', readNotification);
