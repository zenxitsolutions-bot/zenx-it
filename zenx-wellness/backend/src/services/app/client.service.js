import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'

const staffSummary = { select: { id: true, firstName: true, lastName: true, email: true, role: true } }

const clientInclude = {
  assignedDietitian: staffSummary,
  assignedTrainer: staffSummary,
}

/** BMI in kg/m². Derived rather than trusted, so it can't drift from the inputs. */
export const deriveBmi = (heightCm, weightKg) => {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null
  const metres = heightCm / 100
  return Math.round((weightKg / (metres * metres)) * 10) / 10
}

const findScoped = async (companyId, id) => {
  const client = await prisma.client.findFirst({ where: { id, companyId }, include: clientInclude })
  if (!client) throw new ApiError(404, 'Client not found')
  return client
}

/**
 * Staff assignments must resolve inside the same company and actually hold the
 * matching role — otherwise a client could be pointed at another tenant's user.
 */
const assertStaff = async (companyId, userId, expectedRole, field) => {
  if (!userId) return

  const user = await prisma.user.findFirst({ where: { id: userId, companyId } })
  if (!user) throw badRequest('That staff member is not in this workspace', { [field]: 'Unknown user' })
  if (user.role !== expectedRole) {
    throw badRequest(`Assigned user must be a ${expectedRole.toLowerCase()}`, { [field]: `Not a ${expectedRole.toLowerCase()}` })
  }
  if (user.status !== 'ACTIVE') {
    throw badRequest('That staff member is deactivated', { [field]: 'User is inactive' })
  }
}

const assertCallingRules = (data) => {
  if (data.callingFrequency !== 'CUSTOM') return

  const hasRule =
    data.everyXDays != null ||
    (Array.isArray(data.specificDaysOfWeek) && data.specificDaysOfWeek.length > 0) ||
    data.specificDayOfMonth != null

  if (!hasRule) {
    throw badRequest('A custom calling frequency needs a rule', {
      callingFrequency: 'Set everyXDays, specificDaysOfWeek or specificDayOfMonth',
    })
  }
}

export const listClients = async (
  companyId,
  { page = 1, pageSize = 20, search, status, assignedDietitianId, assignedTrainerId } = {},
  scope = {},
) => {
  const where = {
    companyId,
    ...scope,
    ...(status ? { status } : {}),
    ...(assignedDietitianId ? { assignedDietitianId } : {}),
    ...(assignedTrainerId ? { assignedTrainerId } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: clientInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

/**
 * Reads one client, honouring a caseload scope. A dietitian or trainer asking
 * for a client outside their own caseload gets a 404, not a 403 — the record is
 * simply not in their view.
 */
export const getClient = async (companyId, id, scope = {}) => {
  const client = await prisma.client.findFirst({
    where: { id, companyId, ...scope },
    include: clientInclude,
  })
  if (!client) throw new ApiError(404, 'Client not found')
  return client
}

export const createClient = async (companyId, payload, { tx } = {}) => {
  const run = async (client) => {
    assertCallingRules(payload)
    await assertStaff(companyId, payload.assignedDietitianId, 'DIETITIAN', 'assignedDietitianId')
    await assertStaff(companyId, payload.assignedTrainerId, 'TRAINER', 'assignedTrainerId')

    if (payload.email) {
      const clash = await client.client.findFirst({ where: { companyId, email: payload.email } })
      if (clash) throw badRequest('A client with that email already exists', { email: 'Already in use' })
    }

    return client.client.create({
      data: {
        ...payload,
        companyId,
        bmi: deriveBmi(payload.heightCm, payload.weightKg),
      },
      include: clientInclude,
    })
  }

  return tx ? run(tx) : run(prisma)
}

export const updateClient = async (companyId, id, payload) => {
  const existing = await findScoped(companyId, id)

  assertCallingRules({ ...existing, ...payload })
  if (payload.assignedDietitianId !== undefined) {
    await assertStaff(companyId, payload.assignedDietitianId, 'DIETITIAN', 'assignedDietitianId')
  }
  if (payload.assignedTrainerId !== undefined) {
    await assertStaff(companyId, payload.assignedTrainerId, 'TRAINER', 'assignedTrainerId')
  }

  if (payload.email) {
    const clash = await prisma.client.findFirst({
      where: { companyId, email: payload.email, id: { not: id } },
    })
    if (clash) throw badRequest('A client with that email already exists', { email: 'Already in use' })
  }

  const heightCm = payload.heightCm ?? existing.heightCm
  const weightKg = payload.weightKg ?? existing.weightKg

  return prisma.client.update({
    where: { id },
    data: { ...payload, bmi: deriveBmi(heightCm, weightKg) },
    include: clientInclude,
  })
}

export const setClientStatus = async (companyId, id, status) => {
  await findScoped(companyId, id)
  return prisma.client.update({ where: { id }, data: { status }, include: clientInclude })
}

export const assignStaff = async (companyId, id, { assignedDietitianId, assignedTrainerId }) => {
  await findScoped(companyId, id)

  const data = {}
  if (assignedDietitianId !== undefined) {
    await assertStaff(companyId, assignedDietitianId, 'DIETITIAN', 'assignedDietitianId')
    data.assignedDietitianId = assignedDietitianId
  }
  if (assignedTrainerId !== undefined) {
    await assertStaff(companyId, assignedTrainerId, 'TRAINER', 'assignedTrainerId')
    data.assignedTrainerId = assignedTrainerId
  }

  return prisma.client.update({ where: { id }, data, include: clientInclude })
}
