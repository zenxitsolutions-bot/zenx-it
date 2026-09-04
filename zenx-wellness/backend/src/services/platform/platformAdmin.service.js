import prisma from '../../config/prisma.js'
import { forbidden } from '../../utils/ApiError.js'

const include = {
  user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } },
}

/**
 * Maps an authenticated SUPER_ADMIN onto their platform-directory row, creating
 * it on first use so super admins seeded before this module still resolve.
 */
export const ensurePlatformAdmin = async (user) => {
  if (user.role !== 'SUPER_ADMIN' || user.companyId !== null) {
    throw forbidden('You do not have permission to perform this action')
  }

  const existing = await prisma.platformAdmin.findUnique({ where: { userId: user.id }, include })
  if (existing) {
    if (!existing.isActive) throw forbidden('Your platform account is deactivated')
    return existing
  }

  return prisma.platformAdmin.create({ data: { userId: user.id }, include })
}

export const listPlatformAdmins = async ({ includeInactive = false } = {}) =>
  prisma.platformAdmin.findMany({
    where: includeInactive ? {} : { isActive: true },
    include,
    orderBy: { createdAt: 'asc' },
  })
