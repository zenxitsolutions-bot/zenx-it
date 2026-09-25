import { Router } from 'express';
import { requirePermission } from '../middleware/permissions.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import { listCalls, getAvailableSlots, createCall, updateCall, deleteCall } from '../controllers/call.controller.js';
import { createCallSchema, updateCallSchema, availableSlotsQuerySchema } from '../schemas/call.schema.js';

export const callRouter = Router();
callRouter.use(authenticate, blockIfMustChangePassword);

callRouter.get('/', requirePermission('calls.view'), listCalls);
callRouter.get('/available-slots', requirePermission('calls.view'), validate(availableSlotsQuerySchema, 'query'), getAvailableSlots);
callRouter.post('/', requirePermission('calls.view', 'calls.manage'), authorize('client', 'dietitian', 'admin'), validate(createCallSchema), createCall);
callRouter.patch('/:id', requirePermission('calls.view', 'calls.manage'), validate(updateCallSchema), updateCall);
callRouter.delete('/:id', requirePermission('calls.view', 'calls.manage'), authorize('dietitian', 'admin'), deleteCall);
