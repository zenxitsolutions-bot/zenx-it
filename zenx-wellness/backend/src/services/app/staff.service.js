import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'
import { createUser, updateUser } from './user.service.js'
import { seedCompanyRoles } from './rbac.service.js'

/**
 * Dietitians and trainers are the same shape over different tables, so the two
 * modules share this implementation and differ only in configuration.
 */
export const STAFF_KINDS = {
  DIETITIAN: {
    model: 'dietitian',
    systemRole: 'DIETITIAN',
    defaultRoleName: 'Dietitian',
    assignmentModel: 'clientDietitianAssignment',
    assignmentField: 'dietitianUserId',
    clientScalar: 'assignedDietitianId',
    label: 'Dietitian',
  },
  TRAINER: {
    model: 'trainer',
    systemRole: 'TRAINER',
    defaultRoleName: 'Trainer',
    assignmentModel: 'clientTrainerAssignment',
    assignmentField: 'trainerUserId',
    clientScalar: 'assignedTrainerId',
    label: 'Trainer',
  },
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  username: true,
  timezone: true,
  status: true,
  role: true,
}

/**
 * Flattens the profile and its user into the field set the brief describes.
 * Identity lives on the user, specialization and address on the profile.
 */
const shape = (profile) => ({
  id: profile.id,
  userId: profile.userId,
  firstName: profile.user.firstName,
  lastName: profile.user.lastName,
  email: profile.user.email,
  phone: profile.user.phone,
  username: profile.user.username,
  timezone: profile.user.timezone,
  // Activation is the user's status — deactivating also revokes the login.
  status: profile.user.status,
  specialization: profile.specialization,
  address: profile.address,
  bio: profile.bio,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
})

const findScoped = async (kind, companyId, id) => {
  const profile = await prisma[kind.model].findFirst({
    where: { id, companyId },
    include: { user: { select: userSelect } },
  })
  if (!profile) throw new ApiError(404, `${kind.label} not found`)
  return profile
}

export const listStaff = async (kind, companyId, { page = 1, pageSize = 20, search, status } = {}) => {
  const where = {
    companyId,
    ...(status || search
      ? {
          user: {
            ...(status ? { status } : {}),
            ...(search
              ? {
                  OR: [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { email: { contains: search } },
                  ],
                }
              : {}),
          },
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma[kind.model].findMany({
      where,
      include: { user: { select: userSelect } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma[kind.model].count({ where }),
  ])

  return { items: items.map(shape), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export const getStaff = async (kind, companyId, id) => shape(await findScoped(kind, companyId, id))

/**
 * Creates the login and the profile together. Reuses the Phase 2B user service
 * so email/username uniqueness and the temporary-password flow stay in one
 * place.
 */
export const createStaff = async (kind, companyId, payload) => {
  const { specialization, address, bio, ...userData } = payload

  const roles = await seedCompanyRoles(companyId)
  const defaultRole = roles[kind.defaultRoleName]

  const { user, temporaryPassword } = await createUser(companyId, {
    ...userData,
    role: kind.systemRole,
    roleIds: defaultRole ? [defaultRole.id] : [],
  })

  const profile = await prisma[kind.model].create({
    data: { companyId, userId: user.id, specialization, address, bio },
    include: { user: { select: userSelect } },
  })

  return { staff: shape(profile), temporaryPassword }
}

export const updateStaff = async (kind, companyId, id, payload) => {
  const profile = await findScoped(kind, companyId, id)
  const { specialization, address, bio, ...userData } = payload

  if (Object.keys(userData).length) {
    await updateUser(companyId, profile.userId, userData)
  }

  const updated = await prisma[kind.model].update({
    where: { id },
    data: {
      ...(specialization !== undefined ? { specialization } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(bio !== undefined ? { bio } : {}),
    },
    include: { user: { select: userSelect } },
  })

  return shape(updated)
}

/** Activation flows through the user record, so the login follows the profile. */
export const setStaffStatus = async (kind, companyId, id, status) => {
  const profile = await findScoped(kind, companyId, id)
  await prisma.user.update({ where: { id: profile.userId }, data: { status } })
  return shape(await findScoped(kind, companyId, id))
}

// ---------------------------------------------------------------------------
// Client assignments
// ---------------------------------------------------------------------------

const assertClient = async (companyId, clientId) => {
  const client = await prisma.client.findFirst({ where: { id: clientId, companyId } })
  if (!client) throw new ApiError(404, 'Client not found')
  return client
}

export const listAssignedClients = async (kind, companyId, staffUserId, { page = 1, pageSize = 20 } = {}) => {
  const where = { companyId, [kind.assignmentModel === 'clientDietitianAssignment' ? 'dietitianAssignments' : 'trainerAssignments']: { some: { [kind.assignmentField]: staffUserId } } }

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export const listClientAssignments = async (kind, companyId, clientId) => {
  await assertClient(companyId, clientId)
  return prisma[kind.assignmentModel].findMany({
    where: { companyId, clientId },
    include: {
      [kind.model === 'dietitian' ? 'dietitian' : 'trainer']: { select: userSelect },
    },
    orderBy: { assignedAt: 'desc' },
  })
}

/**
 * Replaces a client's assignment set for one staff kind. The first entry is
 * marked primary and mirrored onto Client.assignedDietitianId/assignedTrainerId
 * so the Phase 2B scalar stays in step with the join table.
 */
export const setClientAssignments = async (kind, companyId, clientId, staffUserIds, assignedById) => {
  await assertClient(companyId, clientId)

  if (staffUserIds.length) {
    const staff = await prisma.user.findMany({
      where: { id: { in: staffUserIds }, companyId, role: kind.systemRole },
    })
    if (staff.length !== staffUserIds.length) {
      throw badRequest(`One or more users are not ${kind.label.toLowerCase()}s in this workspace`, {
        staffUserIds: 'Unknown or wrong role',
      })
    }
    const inactive = staff.find((user) => user.status !== 'ACTIVE')
    if (inactive) {
      throw badRequest('That staff member is deactivated', { staffUserIds: 'User is inactive' })
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx[kind.assignmentModel].deleteMany({ where: { companyId, clientId } })

    if (staffUserIds.length) {
      await tx[kind.assignmentModel].createMany({
        data: staffUserIds.map((userId, index) => ({
          companyId,
          clientId,
          [kind.assignmentField]: userId,
          isPrimary: index === 0,
          assignedById,
        })),
      })
    }

    await tx.client.update({
      where: { id: clientId },
      data: { [kind.clientScalar]: staffUserIds[0] ?? null },
    })
  })

  return listClientAssignments(kind, companyId, clientId)
}

/**
 * Restricts a client query to the acting user's own caseload.
 *
 * Dietitians and trainers see only clients assigned to them. Anyone holding
 * `clients.assign` is supervisory (Company Admin, Manager) and sees everything;
 * so does a role like Receptionist that has no caseload of its own.
 */
export const clientScopeFilter = (user, permissions) => {
  const isCaseloadRole = user.role === 'DIETITIAN' || user.role === 'TRAINER'
  if (!isCaseloadRole || permissions?.has('clients.assign')) return {}

  return {
    OR: [
      { dietitianAssignments: { some: { dietitianUserId: user.id } } },
      { trainerAssignments: { some: { trainerUserId: user.id } } },
    ],
  }
}
