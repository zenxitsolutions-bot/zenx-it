import asyncHandler from '../utils/asyncHandler.js'
import { forbidden, unauthorized } from '../utils/ApiError.js'
import { getActiveUserById, verifyToken } from '../services/auth.service.js'

const extractBearerToken = (req) => {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (!token || scheme.toLowerCase() !== 'bearer') return null
  return token.trim() || null
}

/**
 * Rejects a token that belongs to a different tenant than the host it arrived
 * on. This is what stops a valid session from one company being replayed
 * against another company's workspace.
 */
export const assertTenantMatchesUser = (tenant, user) => {
  const tenantCompanyId = tenant?.companyId ?? null

  if (user.companyId !== tenantCompanyId) {
    throw forbidden('You do not have access to this workspace')
  }
}

/** Verifies the Bearer token, reloads the user, and attaches them to req.user. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req)
  if (!token) throw unauthorized('Authentication required')

  const payload = verifyToken(token)
  if (!payload?.sub) throw unauthorized('Authentication required')

  // The role always comes from the database, never from the token or the client.
  const user = await getActiveUserById(payload.sub)

  // A platform host carries no tenant, so only companyId === null users (ZenX
  // staff) pass here; a company host admits only that company's users.
  assertTenantMatchesUser(req.tenant, user)

  req.user = user
  next()
})

/**
 * Coarse gate on the SystemRole enum. Used by the platform surface; customer
 * routes use the permission-based `authorize` from rbac.middleware.js instead.
 */
export const authorizeRoles =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized('Authentication required'))
    if (roles.length && !roles.includes(req.user.role)) {
      return next(forbidden('You do not have permission to perform this action'))
    }
    next()
  }
