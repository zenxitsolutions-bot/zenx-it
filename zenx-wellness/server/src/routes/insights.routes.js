import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { adminOverview, dietitianOverview } from '../controllers/insights.controller.js';

export const insightsRouter = Router();
insightsRouter.use(authenticate, blockIfMustChangePassword);

insightsRouter.get('/admin-overview', authorize('admin'), adminOverview);
insightsRouter.get('/dietitian-overview', authorize('dietitian'), dietitianOverview);
