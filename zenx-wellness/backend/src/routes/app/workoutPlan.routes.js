import { Router } from 'express'
import * as workoutPlanController from '../../controllers/app/workoutPlan.controller.js'
import { authorize } from '../../middleware/rbac.middleware.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.middleware.js'
import { idParamSchema } from '../../validators/common.validator.js'
import {
  activeSchema,
  assignPlanSchema,
  createWorkoutPlanSchema,
  planListQuerySchema,
  updateWorkoutPlanSchema,
} from '../../validators/app/plan.validator.js'

const router = Router()

router.get('/', authorize('workout_plans.view'), validateQuery(planListQuerySchema), workoutPlanController.list)
router.post('/', authorize('workout_plans.create'), validateBody(createWorkoutPlanSchema), workoutPlanController.create)
router.get('/:id', authorize('workout_plans.view'), validateParams(idParamSchema), workoutPlanController.get)
router.patch(
  '/:id',
  authorize('workout_plans.edit'),
  validateParams(idParamSchema),
  validateBody(updateWorkoutPlanSchema),
  workoutPlanController.update,
)
router.patch(
  '/:id/status',
  authorize('workout_plans.deactivate'),
  validateParams(idParamSchema),
  validateBody(activeSchema),
  workoutPlanController.setActive,
)
router.put(
  '/:id/assignments',
  authorize('workout_plans.assign'),
  validateParams(idParamSchema),
  validateBody(assignPlanSchema),
  workoutPlanController.assign,
)

export default router
