import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, refresh, logout, me, setNewPassword, getActiveGrants, issueHandoffToken } from '../controllers/customerAuth.controller.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, setNewPasswordSchema } from '../schemas/auth.schema.js';
import { issueHandoffTokenSchema } from '../schemas/provisioning.schema.js';
import { authenticateCustomer } from '../middleware/authenticate.js';

export const customerAuthRouter = Router();

// Own budget, separate from the app-wide polling-sized limiter (app.js) — credential attempts
// stay capped tightly regardless of how generous the general limit is.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a while.' },
});

customerAuthRouter.post('/login', loginLimiter, validate(loginSchema), login);
customerAuthRouter.post('/refresh', refresh);
customerAuthRouter.post('/logout', authenticateCustomer, logout);
customerAuthRouter.get('/me', authenticateCustomer, me);
customerAuthRouter.post('/set-password', authenticateCustomer, validate(setNewPasswordSchema), setNewPassword);
customerAuthRouter.get('/grants', authenticateCustomer, getActiveGrants);
customerAuthRouter.post('/handoff-token', authenticateCustomer, validate(issueHandoffTokenSchema), issueHandoffToken);
