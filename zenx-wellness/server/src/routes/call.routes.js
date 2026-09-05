import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import { listCalls, getAvailableSlots, createCall, updateCall, deleteCall } from '../controllers/call.controller.js';
import { createCallSchema, updateCallSchema, availableSlotsQuerySchema } from '../schemas/call.schema.js';

export const callRouter = Router();
callRouter.use(authenticate, blockIfMustChangePassword);

callRouter.get('/', listCalls);
callRouter.get('/available-slots', validate(availableSlotsQuerySchema, 'query'), getAvailableSlots);
callRouter.post('/', authorize('client', 'dietitian', 'admin'), validate(createCallSchema), createCall);
callRouter.patch('/:id', validate(updateCallSchema), updateCall);
callRouter.delete('/:id', authorize('dietitian', 'admin'), deleteCall);
