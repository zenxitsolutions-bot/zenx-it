import { getEffectivePermissions } from '../services/app/rbac.service.js'
import { forbidden, unauthorized } from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

/**
 * Permission gate for customer routes. The required key is checked against the
 * permissions the user's assigned roles actually grant, loaded fresh from the
 * database — nothing is read from the token or the request body.
 *
 * Use this instead of inline role checks inside controllers.
 */
export const authorize = (permission) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) throw unauthorized('Authentication required')

    const granted = await getEffectivePermissions(req.user.id)
    req.permissions = granted

    if (!granted.has(permission)) {
      throw forbidden('You do not have permission to perform this action')
    }

    next()
  })

/** Passes when the user holds any one of the listed permissions. */
export const authorizeAny = (...permissions) =>
  asyncHandler(async (req, _res, next) => {
    if (!req.user) throw unauthorized('Authentication required')

    const granted = await getEffectivePermissions(req.user.id)
    req.permissions = granted

    if (!permissions.some((permission) => granted.has(permission))) {
      throw forbidden('You do not have permission to perform this action')
    }

    next()
  })
