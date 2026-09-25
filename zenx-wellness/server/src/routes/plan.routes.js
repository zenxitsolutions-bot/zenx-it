import { Router } from 'express';
import { requireAnyPermission, requirePermission } from '../middleware/permissions.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import {
  listPlans,
  getPlan,
  downloadPlanPdf,
  createPlan,
  updatePlan,
  deletePlan,
  updateMealStatus,
} from '../controllers/plan.controller.js';
import { createPlanSchema, updatePlanSchema, updateMealStatusSchema } from '../schemas/plan.schema.js';

export const planRouter = Router();
planRouter.use(authenticate, blockIfMustChangePassword);

planRouter.get('/', requirePermission('diet_plans.view'), listPlans);
planRouter.get('/:id/pdf', requirePermission('diet_plans.view'), downloadPlanPdf);
planRouter.get('/:id', requirePermission('diet_plans.view'), getPlan);
planRouter.post('/', requirePermission('diet_plans.view', 'diet_plans.edit'), authorize('dietitian', 'admin'), validate(createPlanSchema), createPlan);
planRouter.patch('/:id', requirePermission('diet_plans.view'), requireAnyPermission('diet_plans.edit', 'diet_plans.publish'), authorize('dietitian', 'admin'), validate(updatePlanSchema), updatePlan);
planRouter.patch(
  '/:id/meals/:index',
  authorize('client'),
  validate(updateMealStatusSchema),
  updateMealStatus
);
planRouter.delete('/:id', requirePermission('diet_plans.view', 'diet_plans.delete'), authorize('dietitian', 'admin'), deletePlan);
