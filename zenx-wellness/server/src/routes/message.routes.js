import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import {
  listMessages,
  createMessage,
  markRead,
  getUnreadCount,
  listConversations,
  streamMessages,
  getPresence,
} from '../controllers/message.controller.js';
import { createMessageSchema, markReadSchema } from '../schemas/message.schema.js';

export const messageRouter = Router();
messageRouter.use(authenticate, blockIfMustChangePassword);

messageRouter.get('/conversations', authorize('dietitian'), listConversations);
messageRouter.get('/unread-count', authorize('client', 'dietitian'), getUnreadCount);
messageRouter.get('/presence', authorize('client', 'dietitian', 'admin'), getPresence);
messageRouter.get('/stream', authorize('client', 'dietitian', 'admin'), streamMessages);
messageRouter.get('/', authorize('client', 'dietitian'), listMessages);
messageRouter.post('/', authorize('client', 'dietitian'), validate(createMessageSchema), createMessage);
messageRouter.post('/read', authorize('client', 'dietitian'), validate(markReadSchema), markRead);
