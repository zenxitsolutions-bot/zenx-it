import { Router } from 'express'
import { z } from 'zod'
import * as dietPlanController from '../../controllers/app/dietPlan.controller.js'
import { authorize } from '../../middleware/rbac.middleware.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.middleware.js'
import { idParamSchema, uuid } from '../../validators/common.validator.js'
import {
  activeSchema,
  assignPlanSchema,
  copyPlanSchema,
  createDietPlanSchema,
  planListQuerySchema,
  setDietPlanDaySchema,
  updateDietPlanSchema,
} from '../../validators/app/plan.validator.js'

const router = Router()

const dayParamSchema = z.object({ id: uuid, dayOfWeek: z.coerce.number().int().min(1).max(7) })

router.get('/', authorize('diet_plans.view'), validateQuery(planListQuerySchema), dietPlanController.list)
router.post('/', authorize('diet_plans.create'), validateBody(createDietPlanSchema), dietPlanController.create)
router.get('/:id', authorize('diet_plans.view'), validateParams(idParamSchema), dietPlanController.get)
router.patch(
  '/:id',
  authorize('diet_plans.edit'),
  validateParams(idParamSchema),
  validateBody(updateDietPlanSchema),
  dietPlanController.update,
)
router.put(
  '/:id/days/:dayOfWeek',
  authorize('diet_plans.edit'),
  validateParams(dayParamSchema),
  validateBody(setDietPlanDaySchema),
  dietPlanController.setDay,
)
router.post(
  '/:id/copy',
  authorize('diet_plans.create'),
  validateParams(idParamSchema),
  validateBody(copyPlanSchema),
  dietPlanController.copy,
)
router.patch(
  '/:id/status',
  authorize('diet_plans.deactivate'),
  validateParams(idParamSchema),
  validateBody(activeSchema),
  dietPlanController.setActive,
)
router.put(
  '/:id/assignments',
  authorize('diet_plans.assign'),
  validateParams(idParamSchema),
  validateBody(assignPlanSchema),
  dietPlanController.assign,
)

export default router
