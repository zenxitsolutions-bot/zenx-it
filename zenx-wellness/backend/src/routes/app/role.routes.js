import { Router } from 'express'
import * as roleController from '../../controllers/app/role.controller.js'
import { authorize } from '../../middleware/rbac.middleware.js'
import { validateBody, validateParams } from '../../middleware/validate.middleware.js'
import { idParamSchema } from '../../validators/common.validator.js'
import {
  createRoleSchema,
  roleActiveSchema,
  setPermissionsSchema,
  updateRoleSchema,
} from '../../validators/app/role.validator.js'

const router = Router()

router.get('/permissions', authorize('roles.view'), roleController.listPermissions)

router.get('/', authorize('roles.view'), roleController.list)
router.post('/', authorize('roles.create'), validateBody(createRoleSchema), roleController.create)
router.get('/:id', authorize('roles.view'), validateParams(idParamSchema), roleController.get)
router.patch(
  '/:id',
  authorize('roles.edit'),
  validateParams(idParamSchema),
  validateBody(updateRoleSchema),
  roleController.update,
)
router.put(
  '/:id/permissions',
  authorize('roles.assign_permissions'),
  validateParams(idParamSchema),
  validateBody(setPermissionsSchema),
  roleController.setPermissions,
)
router.patch(
  '/:id/status',
  authorize('roles.deactivate'),
  validateParams(idParamSchema),
  validateBody(roleActiveSchema),
  roleController.setActive,
)

export default router
