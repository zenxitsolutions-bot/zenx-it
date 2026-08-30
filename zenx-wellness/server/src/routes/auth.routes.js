import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, refresh, logout, me, changePassword, forgotPassword, resetPassword, handoff } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, handoffSchema } from '../schemas/auth.schema.js';
import { authenticate } from '../middleware/authenticate.js';

export const authRouter = Router();

// Matches the enquiry-creation limiter (enquiry.routes.js): both are public, unauthenticated
// endpoints that accept an arbitrary email/identity and should be hard to hammer or use to probe
// which emails have accounts.
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again in a while.' },
});

authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/handoff', validate(handoffSchema), handoff);
authRouter.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), resetPassword);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', authenticate, logout);
authRouter.get('/me', authenticate, me);
// Not gated by blockIfMustChangePassword — this is the one call a user whose flag is still set
// must be able to reach (spec: "reject API calls ... except the change-password call").
authRouter.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
