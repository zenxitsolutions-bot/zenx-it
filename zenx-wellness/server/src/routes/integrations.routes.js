import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { getGoogleStatus, startGoogleAuth, googleCallback, disconnectGoogle } from '../controllers/integrations.controller.js';

export const integrationsRouter = Router();

// Mounted before the authenticate-everything block below: Google redirects a browser here with no
// Authorization header, and the signed `state` is what authorises it instead (see the controller).
integrationsRouter.get('/google/callback', googleCallback);

integrationsRouter.use(authenticate, blockIfMustChangePassword);

// Dietitians host the calls, so theirs is the calendar a Meet room is created on. Admins are
// included because an admin can be the assigned host on this app's own booking screens.
integrationsRouter.get('/google/status', authorize('dietitian', 'admin'), getGoogleStatus);
integrationsRouter.post('/google/connect', authorize('dietitian', 'admin'), startGoogleAuth);
integrationsRouter.delete('/google', authorize('dietitian', 'admin'), disconnectGoogle);
