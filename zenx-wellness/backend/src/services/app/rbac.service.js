import prisma from '../../config/prisma.js'
import { DEFAULT_ROLES } from '../../constants/permissions.js'

/**
 * Effective permissions for a user: the union of the permission sets on every
 * active role assigned to them. Roles are per company, so a user only ever
 * accumulates permissions inside their own tenant.
 */
export const getEffectivePermissions = async (userId) => {
  const assignments = await prisma.userRole.findMany({
    where: { userId, role: { isActive: true } },
    select: {
      role: {
        select: {
          companyId: true,
          permissions: { select: { permission: { select: { key: true } } } },
        },
      },
    },
  })

  const keys = new Set()
  for (const { role } of assignments) {
    for (const entry of role.permissions) keys.add(entry.permission.key)
  }
  return keys
}

export const getUserRoles = async (userId) =>
  prisma.userRole.findMany({
    where: { userId },
    select: {
      assignedAt: true,
      role: { select: { id: true, name: true, description: true, isSystem: true, isActive: true } },
    },
  })

/**
 * Creates the default role set for a new company and returns them by name.
 * Idempotent, so it can also backfill a company that predates this module.
 */
export const seedCompanyRoles = async (companyId, client = prisma) => {
  const permissions = await client.permission.findMany({ select: { id: true, key: true } })
  const idByKey = new Map(permissions.map((permission) => [permission.key, permission.id]))

  const byName = {}

  for (const definition of DEFAULT_ROLES) {
    const existing = await client.role.findUnique({
      where: { companyId_name: { companyId, name: definition.name } },
    })

    if (existing) {
      // The admin role must always hold the whole catalog, so re-sync it as the
      // catalog grows. Other system roles are tenant-editable and left alone.
      if (definition.name === 'Company Admin') {
        const held = await client.rolePermission.findMany({
          where: { roleId: existing.id },
          select: { permissionId: true },
        })
        const heldIds = new Set(held.map((row) => row.permissionId))
        const missing = definition.permissions
          .map((key) => idByKey.get(key))
          .filter((id) => id && !heldIds.has(id))

        if (missing.length) {
          await client.rolePermission.createMany({
            data: missing.map((permissionId) => ({ roleId: existing.id, permissionId })),
          })
        }
      }

      byName[definition.name] = existing
      continue
    }

    const role = await client.role.create({
      data: {
        companyId,
        name: definition.name,
        description: definition.description,
        isSystem: definition.isSystem,
      },
    })

    const rows = definition.permissions
      .map((key) => idByKey.get(key))
      .filter(Boolean)
      .map((permissionId) => ({ roleId: role.id, permissionId }))

    if (rows.length) await client.rolePermission.createMany({ data: rows })

    byName[definition.name] = role
  }

  return byName
}

export const assignRoleToUser = async (userId, roleId, client = prisma) =>
  client.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  })
