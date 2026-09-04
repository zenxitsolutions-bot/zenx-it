import { ensurePlatformAdmin } from '../services/platform/platformAdmin.service.js'
import asyncHandler from '../utils/asyncHandler.js'

/** Resolves req.user onto their PlatformAdmin row and attaches it. */
export const attachPlatformAdmin = asyncHandler(async (req, _res, next) => {
  req.platformAdmin = await ensurePlatformAdmin(req.user)
  next()
})
