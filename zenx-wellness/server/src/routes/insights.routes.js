import { Router } from 'express';
import { requirePermission } from '../middleware/permissions.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { adminOverview, dietitianOverview } from '../controllers/insights.controller.js';

export const insightsRouter = Router();
insightsRouter.use(authenticate, blockIfMustChangePassword, requirePermission('insights.view'));

insightsRouter.get('/admin-overview', authorize('admin'), adminOverview);
insightsRouter.get('/dietitian-overview', authorize('dietitian'), dietitianOverview);
