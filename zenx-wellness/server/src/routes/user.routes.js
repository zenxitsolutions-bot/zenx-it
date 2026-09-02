import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import { listUsers, getUser, updateMe, updateUser, createUser, registerDeviceToken, unregisterDeviceToken } from '../controllers/user.controller.js';
import { updateMeSchema, updateUserSchema, createUserSchema, registerDeviceTokenSchema } from '../schemas/user.schema.js';

export const userRouter = Router();
userRouter.use(authenticate, blockIfMustChangePassword);

userRouter.get('/', authorize('admin', 'dietitian', 'client'), listUsers);
userRouter.get('/:id', getUser);
userRouter.patch('/me', validate(updateMeSchema), updateMe);
userRouter.post('/me/device-token', validate(registerDeviceTokenSchema), registerDeviceToken);
userRouter.delete('/me/device-token', validate(registerDeviceTokenSchema), unregisterDeviceToken);
// dietitian: only their own assigned client's email/phone (enforced in the controller, since it
// depends on which user is being targeted — a static route guard can't see that).
userRouter.patch('/:id', authorize('admin', 'dietitian'), validate(updateUserSchema), updateUser);
userRouter.post('/', authorize('admin'), validate(createUserSchema), createUser);
