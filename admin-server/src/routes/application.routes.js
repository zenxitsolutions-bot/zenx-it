import { Router } from 'express';
import { authenticateStaff } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { getApplications, patchApplicationUrl } from '../controllers/application.controller.js';

export const applicationRouter = Router();

applicationRouter.use(authenticateStaff);
applicationRouter.get('/', getApplications);
applicationRouter.patch('/:id', authorize('Super Admin', 'Admin'), patchApplicationUrl);
