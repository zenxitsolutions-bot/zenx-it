import { Router } from 'express'
import * as planController from '../../controllers/platform/plan.controller.js'
import { validateBody, validateParams } from '../../middleware/validate.middleware.js'
import { idParamSchema } from '../../validators/common.validator.js'
import { createPlanSchema, updatePlanSchema } from '../../validators/platform/plan.validator.js'

const router = Router()

router.get('/', planController.list)
router.post('/', validateBody(createPlanSchema), planController.create)
router.get('/:id', validateParams(idParamSchema), planController.get)
router.patch('/:id', validateParams(idParamSchema), validateBody(updatePlanSchema), planController.update)
router.post('/:id/activate', validateParams(idParamSchema), planController.activate)
router.post('/:id/deactivate', validateParams(idParamSchema), planController.deactivate)

export default router
