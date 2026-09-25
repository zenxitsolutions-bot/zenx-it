import { Router } from 'express';
import { requirePermission } from '../middleware/permissions.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import {
  listProgress,
  createProgress,
  updateProgress,
  deleteProgress,
} from '../controllers/progress.controller.js';
import { createProgressSchema, updateProgressSchema } from '../schemas/progress.schema.js';

export const progressRouter = Router();
progressRouter.use(authenticate, blockIfMustChangePassword);

progressRouter.get('/', requirePermission('clients.view'), listProgress);
progressRouter.post('/', authorize('client'), validate(createProgressSchema), createProgress);
progressRouter.patch('/:id', requirePermission('clients.view', 'clients.edit'), validate(updateProgressSchema), updateProgress);
progressRouter.delete('/:id', requirePermission('clients.view', 'clients.edit'), deleteProgress);
