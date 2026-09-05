import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { getMyCompany, getPublicCompany } from '../controllers/company.controller.js';

export const companyRouter = Router();

// Public branding lookup — declared before the authenticate guard below so it stays reachable
// logged-out (the slug-scoped login page renders the tenant's name before anyone has a token).
companyRouter.get('/public/:slug', getPublicCompany);

companyRouter.use(authenticate, blockIfMustChangePassword);
// Every role, not just admin: the sidebar renders company branding for clients and dietitians too.
companyRouter.get('/me', getMyCompany);
