import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'

const ADMIN_ROLE_NAME = 'Company Admin'

const roleInclude = {
  permissions: { select: { permission: { select: { id: true, key: true, category: true, action: true, label: true } } } },
  _count: { select: { users: true } },
}

const shape = (role) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  isSystem: role.isSystem,
  isActive: role.isActive,
  userCount: role._count?.users ?? 0,
  permissions: (role.permissions ?? []).map((entry) => entry.permission),
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
})

/** Always scoped by companyId, so a role id from another tenant simply misses. */
const findScoped = async (companyId, id) => {
  const role = await prisma.role.findFirst({ where: { id, companyId }, include: roleInclude })
  if (!role) throw new ApiError(404, 'Role not found')
  return role
}

export const listPermissions = async () =>
  prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { action: 'asc' }] })

export const listRoles = async (companyId, { includeInactive = false } = {}) => {
  const roles = await prisma.role.findMany({
    where: { companyId, ...(includeInactive ? {} : { isActive: true }) },
    include: roleInclude,
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  })
  return roles.map(shape)
}

export const getRole = async (companyId, id) => shape(await findScoped(companyId, id))

const resolvePermissionIds = async (keys) => {
  if (!keys?.length) return []

  const found = await prisma.permission.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } })
  const missing = keys.filter((key) => !found.some((permission) => permission.key === key))

  if (missing.length) {
    throw badRequest('Unknown permissions requested', { permissions: `Unknown: ${missing.join(', ')}` })
  }

  return found.map((permission) => permission.id)
}

export const createRole = async (companyId, { name, description, permissions = [] }) => {
  const clash = await prisma.role.findUnique({ where: { companyId_name: { companyId, name } } })
  if (clash) throw badRequest('A role with that name already exists', { name: 'Already in use' })

  const permissionIds = await resolvePermissionIds(permissions)

  const role = await prisma.role.create({
    data: {
      companyId,
      name,
      description,
      isSystem: false,
      permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
    },
    include: roleInclude,
  })

  return shape(role)
}

export const updateRole = async (companyId, id, { name, description }) => {
  const role = await findScoped(companyId, id)

  if (name && name !== role.name) {
    if (role.isSystem) throw badRequest('A default role cannot be renamed')
    const clash = await prisma.role.findUnique({ where: { companyId_name: { companyId, name } } })
    if (clash) throw badRequest('A role with that name already exists', { name: 'Already in use' })
  }

  const updated = await prisma.role.update({
    where: { id },
    data: { ...(name ? { name } : {}), ...(description !== undefined ? { description } : {}) },
    include: roleInclude,
  })

  return shape(updated)
}

/**
 * Replaces a role's permission set wholesale. The Company Admin role is left
 * alone — stripping it is how a tenant would lock itself out of its own
 * workspace with no way back in.
 */
export const setRolePermissions = async (companyId, id, permissions) => {
  const role = await findScoped(companyId, id)

  if (role.isSystem && role.name === ADMIN_ROLE_NAME) {
    throw badRequest('The Company Admin role always holds every permission')
  }

  const permissionIds = await resolvePermissionIds(permissions)

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    ...(permissionIds.length
      ? [prisma.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })) })]
      : []),
  ])

  return shape(await findScoped(companyId, id))
}

export const setRoleActive = async (companyId, id, isActive) => {
  const role = await findScoped(companyId, id)

  if (role.isSystem && role.name === ADMIN_ROLE_NAME && !isActive) {
    throw badRequest('The Company Admin role cannot be deactivated')
  }

  if (!isActive && role._count.users > 0) {
    throw badRequest(`This role is still assigned to ${role._count.users} user(s)`)
  }

  return shape(await prisma.role.update({ where: { id }, data: { isActive }, include: roleInclude }))
}
