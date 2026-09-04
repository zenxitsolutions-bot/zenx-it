import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validateBody, validateQuery } from '../middleware/validate.middleware.js'
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  resetTokenQuerySchema,
} from '../validators/auth.validator.js'

const router = Router()

router.get('/context', authController.tenantContext)
router.post('/login', validateBody(loginSchema), authController.login)
router.post(
  '/forgot-password',
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
)
router.get(
  '/reset-password',
  validateQuery(resetTokenQuerySchema),
  authController.verifyResetToken,
)
router.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  authController.resetPassword,
)
router.get('/me', authenticate, authController.me)
router.post('/logout', authenticate, authController.logout)

export default router
