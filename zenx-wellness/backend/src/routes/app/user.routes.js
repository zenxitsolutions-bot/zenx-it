import { Router } from 'express'
import * as userController from '../../controllers/app/user.controller.js'
import { authorize } from '../../middleware/rbac.middleware.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.middleware.js'
import { idParamSchema } from '../../validators/common.validator.js'
import {
  assignRolesSchema,
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
  userStatusSchema,
} from '../../validators/app/user.validator.js'

const router = Router()

router.get('/', authorize('users.view'), validateQuery(userListQuerySchema), userController.list)
router.post('/', authorize('users.create'), validateBody(createUserSchema), userController.create)
router.get('/:id', authorize('users.view'), validateParams(idParamSchema), userController.get)
router.patch(
  '/:id',
  authorize('users.edit'),
  validateParams(idParamSchema),
  validateBody(updateUserSchema),
  userController.update,
)
// Assigning a role to a user is a user edit; the roles.* set governs the roles
// themselves, not who holds them.
router.put(
  '/:id/roles',
  authorize('users.edit'),
  validateParams(idParamSchema),
  validateBody(assignRolesSchema),
  userController.assignRoles,
)
router.patch(
  '/:id/status',
  authorize('users.deactivate'),
  validateParams(idParamSchema),
  validateBody(userStatusSchema),
  userController.setStatus,
)
router.post(
  '/:id/reset-password',
  authorize('users.reset_password'),
  validateParams(idParamSchema),
  userController.resetPassword,
)

export default router
