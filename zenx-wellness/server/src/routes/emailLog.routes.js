import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import { listEmails, getEmail, resendEmail } from '../controllers/emailLog.controller.js';
import { listEmailLogsQuerySchema } from '../schemas/emailLog.schema.js';

export const emailLogRouter = Router();
emailLogRouter.use(authenticate, blockIfMustChangePassword, authorize('admin'));

emailLogRouter.get('/', validate(listEmailLogsQuerySchema, 'query'), listEmails);
emailLogRouter.get('/:id', getEmail);
emailLogRouter.post('/:id/resend', resendEmail);
