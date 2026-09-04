import bcrypt from 'bcryptjs'
import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'
import { generateTemporaryPassword } from '../../utils/password.js'
import { toPublicUser } from '../auth.service.js'

const userInclude = {
  roles: { select: { role: { select: { id: true, name: true, isSystem: true, isActive: true } } } },
}

const shape = (user) => ({
  ...toPublicUser(user),
  roles: (user.roles ?? []).map((entry) => entry.role),
})

/** Every lookup carries companyId, so an id from another tenant never resolves. */
const findScoped = async (companyId, id) => {
  const user = await prisma.user.findFirst({ where: { id, companyId }, include: userInclude })
  if (!user) throw new ApiError(404, 'User not found')
  return user
}

export const listUsers = async (companyId, { page = 1, pageSize = 20, search, role, status } = {}) => {
  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { username: { contains: search } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: userInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return { items: items.map(shape), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export const getUser = async (companyId, id) => shape(await findScoped(companyId, id))

/** Roles must belong to this company — this is what blocks cross-tenant grants. */
const assertRolesInCompany = async (companyId, roleIds) => {
  if (!roleIds?.length) return []

  const roles = await prisma.role.findMany({ where: { id: { in: roleIds }, companyId } })
  if (roles.length !== roleIds.length) {
    throw badRequest('One or more roles are not available in this workspace', { roleIds: 'Unknown role' })
  }
  return roles
}

export const createUser = async (companyId, { roleIds = [], ...data }) => {
  const emailTaken = await prisma.user.findUnique({
    where: { companyId_email: { companyId, email: data.email } },
  })
  if (emailTaken) throw badRequest('That email is already in use', { email: 'Already in use' })

  if (data.username) {
    const usernameTaken = await prisma.user.findUnique({ where: { username: data.username } })
    if (usernameTaken) throw badRequest('That username is already taken', { username: 'Already in use' })
  }

  await assertRolesInCompany(companyId, roleIds)

  const temporaryPassword = generateTemporaryPassword()

  const user = await prisma.user.create({
    data: {
      ...data,
      companyId,
      passwordHash: await bcrypt.hash(temporaryPassword, 10),
      mustChangePassword: true,
      roles: { create: roleIds.map((roleId) => ({ roleId })) },
    },
    include: userInclude,
  })

  // Returned once and never recoverable — the hash is all that is stored.
  return { user: shape(user), temporaryPassword }
}

export const updateUser = async (companyId, id, { roleIds, ...data }) => {
  await findScoped(companyId, id)

  if (data.email) {
    const clash = await prisma.user.findFirst({
      where: { companyId, email: data.email, id: { not: id } },
    })
    if (clash) throw badRequest('That email is already in use', { email: 'Already in use' })
  }

  if (data.username) {
    const clash = await prisma.user.findFirst({ where: { username: data.username, id: { not: id } } })
    if (clash) throw badRequest('That username is already taken', { username: 'Already in use' })
  }

  if (roleIds) await assertRolesInCompany(companyId, roleIds)

  const updated = await prisma.$transaction(async (tx) => {
    if (roleIds) {
      await tx.userRole.deleteMany({ where: { userId: id } })
      if (roleIds.length) {
        await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) })
      }
    }
    return tx.user.update({ where: { id }, data, include: userInclude })
  })

  return shape(updated)
}

export const setUserStatus = async (companyId, id, status, actingUserId) => {
  await findScoped(companyId, id)

  // Deactivating yourself would end your own session mid-request.
  if (id === actingUserId && status !== 'ACTIVE') {
    throw badRequest('You cannot deactivate your own account')
  }

  return shape(await prisma.user.update({ where: { id }, data: { status }, include: userInclude }))
}

/** Issues a fresh temporary password and forces a change at next sign-in. */
export const resetPassword = async (companyId, id) => {
  await findScoped(companyId, id)

  const temporaryPassword = generateTemporaryPassword()
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(temporaryPassword, 10), mustChangePassword: true },
  })

  return { temporaryPassword }
}

export const assignRoles = async (companyId, id, roleIds) => updateUser(companyId, id, { roleIds })
