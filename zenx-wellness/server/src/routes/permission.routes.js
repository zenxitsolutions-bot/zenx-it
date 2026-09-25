import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { getPermissions, updatePermissions } from '../controllers/permission.controller.js';
import { requirePermission } from '../middleware/permissions.js';

export const permissionRouter = Router();
permissionRouter.use(authenticate, blockIfMustChangePassword, authorize('admin'));
permissionRouter.get('/', getPermissions);
permissionRouter.put('/:userId', requirePermission('permissions.manage'), updatePermissions);
