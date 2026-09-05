import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import {
  getWeeklyHours,
  putWeeklyHours,
  listAvailabilityExceptions,
  createAvailabilityException,
  deleteAvailabilityException,
} from '../controllers/availability.controller.js';
import { weeklyHoursSchema, createExceptionSchema } from '../schemas/availability.schema.js';

export const availabilityRouter = Router();
availabilityRouter.use(authenticate, blockIfMustChangePassword, authorize('dietitian', 'admin'));

// Weekly hours: dietitian self-service, or admin on behalf of a named dietitian (?dietitian=/body
// `dietitian` — see availability.controller.js#resolveDietitianId; spec §2026-round2-fixes item
// 2). Exceptions stay dietitian-only (authorize() re-narrowed per-route below) — unchanged.
availabilityRouter.get('/weekly-hours', getWeeklyHours);
availabilityRouter.put('/weekly-hours', validate(weeklyHoursSchema), putWeeklyHours);
availabilityRouter.get('/exceptions', authorize('dietitian'), listAvailabilityExceptions);
availabilityRouter.post('/exceptions', authorize('dietitian'), validate(createExceptionSchema), createAvailabilityException);
availabilityRouter.delete('/exceptions/:id', authorize('dietitian'), deleteAvailabilityException);
