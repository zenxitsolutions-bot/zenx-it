import { Router } from 'express';
import { authenticateStaff } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { listAdminUsers, inviteAdminUser, patchAdminUser, setPasswordFromToken } from '../controllers/adminUsers.controller.js';
import { inviteAdminUserSchema, patchAdminUserSchema, setPasswordFromTokenSchema } from '../schemas/adminUser.schema.js';

export const adminUsersRouter = Router();

// Public — the fresh invitee has no session yet, only the one-time token.
adminUsersRouter.post('/set-password', validate(setPasswordFromTokenSchema), setPasswordFromToken);

adminUsersRouter.use(authenticateStaff);
adminUsersRouter.get('/', listAdminUsers);
adminUsersRouter.post('/invite', authorize('Super Admin', 'Admin'), validate(inviteAdminUserSchema), inviteAdminUser);
adminUsersRouter.patch('/:id', authorize('Super Admin', 'Admin'), validate(patchAdminUserSchema), patchAdminUser);
