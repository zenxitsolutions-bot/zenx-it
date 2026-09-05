import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  updateMealStatus,
} from '../controllers/plan.controller.js';
import { createPlanSchema, updatePlanSchema, updateMealStatusSchema } from '../schemas/plan.schema.js';

export const planRouter = Router();
planRouter.use(authenticate, blockIfMustChangePassword);

planRouter.get('/', listPlans);
planRouter.get('/:id', getPlan);
planRouter.post('/', authorize('dietitian', 'admin'), validate(createPlanSchema), createPlan);
planRouter.patch('/:id', authorize('dietitian', 'admin'), validate(updatePlanSchema), updatePlan);
planRouter.patch(
  '/:id/meals/:index',
  authorize('client'),
  validate(updateMealStatusSchema),
  updateMealStatus
);
planRouter.delete('/:id', authorize('dietitian', 'admin'), deletePlan);
