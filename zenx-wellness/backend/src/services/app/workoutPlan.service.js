import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'

const creator = { select: { id: true, firstName: true, lastName: true } }

const planInclude = {
  createdBy: creator,
  items: {
    include: {
      exercise: {
        select: { id: true, name: true, targetMuscleGroup: true, difficulty: true, mediaUrl: true },
      },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { sortOrder: 'asc' }],
  },
  assignments: {
    include: { client: { select: { id: true, firstName: true, lastName: true, status: true } } },
  },
}

const findScoped = async (companyId, id) => {
  const plan = await prisma.workoutPlan.findFirst({ where: { id, companyId }, include: planInclude })
  if (!plan) throw new ApiError(404, 'Workout plan not found')
  return plan
}

/**
 * A weekly plan places every item on a weekday; a daily plan is a single
 * ordered list with no weekday at all.
 */
const assertItemsMatchPlanType = (planType, items) => {
  items.forEach((item, index) => {
    if (planType === 'WEEKLY' && item.dayOfWeek == null) {
      throw badRequest('Every item in a weekly plan needs a day of week', {
        [`items.${index}.dayOfWeek`]: 'Required for a weekly plan',
      })
    }
    if (planType === 'DAILY' && item.dayOfWeek != null) {
      throw badRequest('A daily plan does not take days of week', {
        [`items.${index}.dayOfWeek`]: 'Not allowed on a daily plan',
      })
    }
  })
}

const assertExercisesInCompany = async (companyId, items) => {
  const exerciseIds = [...new Set(items.map((item) => item.exerciseId))]
  if (!exerciseIds.length) return

  const found = await prisma.exercise.findMany({
    where: { id: { in: exerciseIds }, companyId },
    select: { id: true },
  })
  if (found.length !== exerciseIds.length) {
    throw badRequest('One or more exercises are not in this workspace', { items: 'Unknown exercise' })
  }
}

export const listPlans = async (companyId, { page = 1, pageSize = 20, search, isActive, planType, clientId } = {}) => {
  const where = {
    companyId,
    ...(isActive === undefined ? {} : { isActive }),
    ...(planType ? { planType } : {}),
    ...(clientId ? { assignments: { some: { clientId } } } : {}),
    ...(search ? { OR: [{ name: { contains: search } }, { description: { contains: search } }] } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.workoutPlan.findMany({
      where,
      include: { createdBy: creator, _count: { select: { items: true, assignments: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.workoutPlan.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export const getPlan = async (companyId, id) => findScoped(companyId, id)

export const createPlan = async (companyId, createdById, { items = [], ...data }) => {
  const planType = data.planType ?? 'WEEKLY'
  assertItemsMatchPlanType(planType, items)
  await assertExercisesInCompany(companyId, items)

  return prisma.workoutPlan.create({
    data: {
      ...data,
      planType,
      companyId,
      createdById,
      items: { create: items.map((item) => ({ ...item, companyId })) },
    },
    include: planInclude,
  })
}

export const updatePlan = async (companyId, id, { items, ...data }) => {
  const existing = await findScoped(companyId, id)

  if (items) {
    assertItemsMatchPlanType(data.planType ?? existing.planType, items)
    await assertExercisesInCompany(companyId, items)
  }

  await prisma.$transaction(async (tx) => {
    await tx.workoutPlan.update({ where: { id }, data })

    if (items) {
      await tx.workoutPlanItem.deleteMany({ where: { workoutPlanId: id } })
      if (items.length) {
        await tx.workoutPlanItem.createMany({
          data: items.map((item) => ({ ...item, companyId, workoutPlanId: id })),
        })
      }
    }
  })

  return findScoped(companyId, id)
}

export const setPlanActive = async (companyId, id, isActive) => {
  await findScoped(companyId, id)
  return prisma.workoutPlan.update({ where: { id }, data: { isActive }, include: planInclude })
}

export const assignPlan = async (companyId, id, clientIds, assignedById, { startDate, endDate } = {}) => {
  await findScoped(companyId, id)

  if (clientIds.length) {
    const clients = await prisma.client.findMany({ where: { id: { in: clientIds }, companyId } })
    if (clients.length !== clientIds.length) {
      throw badRequest('One or more clients are not in this workspace', { clientIds: 'Unknown client' })
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.workoutPlanAssignment.deleteMany({ where: { companyId, workoutPlanId: id } })
    if (clientIds.length) {
      await tx.workoutPlanAssignment.createMany({
        data: clientIds.map((clientId) => ({
          companyId,
          workoutPlanId: id,
          clientId,
          assignedById,
          startDate,
          endDate,
        })),
      })
    }
  })

  return findScoped(companyId, id)
}

export const listPlansForClient = async (companyId, clientId) =>
  prisma.workoutPlan.findMany({
    where: { companyId, isActive: true, assignments: { some: { clientId, isActive: true } } },
    include: planInclude,
    orderBy: { createdAt: 'desc' },
  })
