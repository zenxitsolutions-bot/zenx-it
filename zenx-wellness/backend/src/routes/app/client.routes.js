import { Router } from 'express'
import * as clientController from '../../controllers/app/client.controller.js'
import { authorize } from '../../middleware/rbac.middleware.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.middleware.js'
import { idParamSchema } from '../../validators/common.validator.js'
import {
  assignStaffSchema,
  clientListQuerySchema,
  clientStatusSchema,
  createClientSchema,
  updateClientSchema,
} from '../../validators/app/client.validator.js'

const router = Router()

router.get('/', authorize('clients.view'), validateQuery(clientListQuerySchema), clientController.list)
router.post('/', authorize('clients.create'), validateBody(createClientSchema), clientController.create)
router.get('/:id', authorize('clients.view'), validateParams(idParamSchema), clientController.get)
router.patch(
  '/:id',
  authorize('clients.edit'),
  validateParams(idParamSchema),
  validateBody(updateClientSchema),
  clientController.update,
)
router.patch(
  '/:id/status',
  authorize('clients.deactivate'),
  validateParams(idParamSchema),
  validateBody(clientStatusSchema),
  clientController.setStatus,
)
router.patch(
  '/:id/assign',
  authorize('clients.assign'),
  validateParams(idParamSchema),
  validateBody(assignStaffSchema),
  clientController.assignStaff,
)

export default router
