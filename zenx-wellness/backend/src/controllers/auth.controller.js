import * as authService from '../services/auth.service.js'
import asyncHandler from '../utils/asyncHandler.js'
import { appOriginFor } from '../utils/origin.js'

export const login = asyncHandler(async (req, res) => {
  // The tenant comes from the subdomain, never from the request body.
  const companyId = req.tenant?.companyId ?? null
  const { user, token } = await authService.login(req.body, companyId)
  res.json({ success: true, message: 'Signed in successfully', data: { user, token } })
})

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user, tenant: req.tenant?.company ?? null } })
})

/**
 * Tokens are stateless, so logout is client-driven; the endpoint exists so the
 * frontend has a single place to hook future token revocation into.
 */
export const logout = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Signed out successfully' })
})

/** Branding for the login screen, resolved from the subdomain. */
export const tenantContext = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { tenant: req.tenant?.company ?? null } })
})

/**
 * Starts a password reset. Always answers 200 with the same message: telling a
 * caller that an address is unknown would leak the customer's user list.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const companyId = req.tenant?.companyId ?? null

  await authService.requestPasswordReset(req.body, companyId, {
    origin: appOriginFor(req),
    workspaceName: req.tenant?.company?.name ?? 'ZenX Wellness',
  })

  res.json({
    success: true,
    message: 'If that email is registered, a reset link is on its way.',
  })
})

/** Lets the reset screen check the link before the user fills the form in. */
export const verifyResetToken = asyncHandler(async (req, res) => {
  const { token } = req.validatedQuery
  const { email } = await authService.verifyPasswordResetToken(token)
  res.json({ success: true, data: { email } })
})

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPasswordWithToken(req.body)
  res.json({ success: true, message: 'Password updated. You can sign in with it now.' })
})
