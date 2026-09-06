import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import { listProgramPlans, createProgramPlan, updateProgramPlan } from '../controllers/programPlan.controller.js';
import { createProgramPlanSchema, updateProgramPlanSchema } from '../schemas/programPlan.schema.js';

export const programPlanRouter = Router();
programPlanRouter.use(authenticate, blockIfMustChangePassword);

programPlanRouter.get('/', authorize('admin', 'dietitian'), listProgramPlans);
programPlanRouter.post('/', authorize('admin'), validate(createProgramPlanSchema), createProgramPlan);
programPlanRouter.patch('/:id', authorize('admin'), validate(updateProgramPlanSchema), updateProgramPlan);
