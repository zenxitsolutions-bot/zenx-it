import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, refresh, logout, me, updateMe, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema.js';
import { updateMyProfileSchema } from '../schemas/adminUser.schema.js';
import { authenticateStaff } from '../middleware/authenticate.js';

export const authRouter = Router();

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again in a while.' },
});

// Own budget, separate from the app-wide polling-sized limiter (app.js) — credential attempts
// stay capped tightly regardless of how generous the general limit is.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a while.' },
});

authRouter.post('/login', loginLimiter, validate(loginSchema), login);
authRouter.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', validate(resetPasswordSchema), resetPassword);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', authenticateStaff, logout);
authRouter.get('/me', authenticateStaff, me);
authRouter.patch('/me', authenticateStaff, validate(updateMyProfileSchema), updateMe);
