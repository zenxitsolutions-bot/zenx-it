import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import {
  listSupportMessages,
  createSupportMessage,
  markSupportRead,
  getSupportUnreadCount,
  listSupportConversations,
} from '../controllers/supportMessage.controller.js';
import { createSupportMessageSchema, markSupportReadSchema } from '../schemas/supportMessage.schema.js';

export const supportMessageRouter = Router();
supportMessageRouter.use(authenticate, blockIfMustChangePassword, authorize('dietitian', 'admin'));

supportMessageRouter.get('/conversations', authorize('admin'), listSupportConversations);
supportMessageRouter.get('/unread-count', getSupportUnreadCount);
supportMessageRouter.get('/', listSupportMessages);
supportMessageRouter.post('/', validate(createSupportMessageSchema), createSupportMessage);
supportMessageRouter.post('/read', validate(markSupportReadSchema), markSupportRead);
