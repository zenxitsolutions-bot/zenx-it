import { Router } from 'express'
import * as subscriptionController from '../../controllers/platform/subscription.controller.js'
import { validateBody, validateParams } from '../../middleware/validate.middleware.js'
import { idParamSchema } from '../../validators/common.validator.js'
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
} from '../../validators/platform/subscription.validator.js'

const router = Router()

router.get('/', subscriptionController.list)
router.post('/', validateBody(createSubscriptionSchema), subscriptionController.create)
router.get('/:id', validateParams(idParamSchema), subscriptionController.get)
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSubscriptionSchema),
  subscriptionController.update,
)

export default router
