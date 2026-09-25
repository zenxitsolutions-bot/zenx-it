import { Router } from 'express';
import { requirePermission } from '../middleware/permissions.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import { getConsultationSchedule, putConsultationSchedule } from '../controllers/consultationSchedule.controller.js';
import { getConsultationScheduleQuerySchema, saveConsultationScheduleSchema } from '../schemas/consultationSchedule.schema.js';

// One endpoint pair, shared by the Admin Dashboard and the Dietitian Portal alike — role checks
// happen inside the controller (assertDietitianOwnsClient), not via two separate route files.
export const consultationScheduleRouter = Router();
consultationScheduleRouter.use(authenticate, blockIfMustChangePassword, authorize('admin', 'dietitian'));

consultationScheduleRouter.get('/', requirePermission('calls.view'), validate(getConsultationScheduleQuerySchema, 'query'), getConsultationSchedule);
consultationScheduleRouter.put('/', requirePermission('calls.view', 'calls.manage'), validate(saveConsultationScheduleSchema), putConsultationSchedule);
