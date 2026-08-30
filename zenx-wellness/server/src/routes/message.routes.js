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
} from '../controllers/message.controller.js';
import { createMessageSchema, markReadSchema } from '../schemas/message.schema.js';

export const messageRouter = Router();
// Admin is deliberately excluded — messaging is client <-> assigned dietitian only (spec §1.5),
// and admin isn't a party to any conversation.
messageRouter.use(authenticate, blockIfMustChangePassword, authorize('client', 'dietitian'));

messageRouter.get('/conversations', authorize('dietitian'), listConversations);
messageRouter.get('/unread-count', getUnreadCount);
messageRouter.get('/', listMessages);
messageRouter.post('/', validate(createMessageSchema), createMessage);
messageRouter.post('/read', validate(markReadSchema), markRead);
