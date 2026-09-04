import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'

const creator = { select: { id: true, firstName: true, lastName: true } }

const planInclude = {
  createdBy: creator,
  items: {
    include: { recipe: { select: { id: true, name: true, mealType: true, calories: true, mediaUrl: true } } },
    orderBy: [{ dayOfWeek: 'asc' }, { mealType: 'asc' }, { sortOrder: 'asc' }],
  },
  assignments: {
    include: { client: { select: { id: true, firstName: true, lastName: true, status: true } } },
  },
}

const findScoped = async (companyId, id) => {
  const plan = await prisma.dietPlan.findFirst({ where: { id, companyId }, include: planInclude })
  if (!plan) throw new ApiError(404, 'Diet plan not found')
  return plan
}

/** An item is either a recipe reference or inline instructions, never both. */
const assertItemShape = (item, index) => {
  const hasRecipe = Boolean(item.recipeId)
  const hasCustom = Boolean(item.customTitle || item.customInstructions)

  if (hasRecipe && hasCustom) {
    throw badRequest('An item references a recipe or carries custom instructions, not both', {
      [`items.${index}`]: 'Choose a recipe or write custom instructions',
    })
  }
  if (!hasRecipe && !hasCustom) {
    throw badRequest('Each item needs a recipe or custom instructions', {
      [`items.${index}`]: 'Choose a recipe or write custom instructions',
    })
  }
}

const assertRecipesInCompany = async (companyId, items, client = prisma) => {
  const recipeIds = [...new Set(items.map((item) => item.recipeId).filter(Boolean))]
  if (!recipeIds.length) return

  const found = await client.recipe.findMany({ where: { id: { in: recipeIds }, companyId }, select: { id: true } })
  if (found.length !== recipeIds.length) {
    throw badRequest('One or more recipes are not in this workspace', { items: 'Unknown recipe' })
  }
}

export const listPlans = async (companyId, { page = 1, pageSize = 20, search, isActive, clientId } = {}) => {
  const where = {
    companyId,
    ...(isActive === undefined ? {} : { isActive }),
    ...(clientId ? { assignments: { some: { clientId } } } : {}),
    ...(search ? { OR: [{ name: { contains: search } }, { description: { contains: search } }] } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.dietPlan.findMany({
      where,
      include: { createdBy: creator, _count: { select: { items: true, assignments: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.dietPlan.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export const getPlan = async (companyId, id) => findScoped(companyId, id)

export const createPlan = async (companyId, createdById, { items = [], ...data }) => {
  items.forEach(assertItemShape)
  await assertRecipesInCompany(companyId, items)

  const plan = await prisma.dietPlan.create({
    data: {
      ...data,
      companyId,
      createdById,
      items: {
        create: items.map((item) => ({ ...item, companyId })),
      },
    },
    include: planInclude,
  })

  return plan
}

export const updatePlan = async (companyId, id, { items, ...data }) => {
  await findScoped(companyId, id)

  if (items) {
    items.forEach(assertItemShape)
    await assertRecipesInCompany(companyId, items)
  }

  await prisma.$transaction(async (tx) => {
    await tx.dietPlan.update({ where: { id }, data })

    // Items are replaced wholesale so the week always reflects the payload.
    if (items) {
      await tx.dietPlanItem.deleteMany({ where: { dietPlanId: id } })
      if (items.length) {
        await tx.dietPlanItem.createMany({
          data: items.map((item) => ({ ...item, companyId, dietPlanId: id })),
        })
      }
    }
  })

  return findScoped(companyId, id)
}

/** Replaces one weekday's meals, leaving the rest of the week untouched. */
export const setPlanDay = async (companyId, id, dayOfWeek, items) => {
  await findScoped(companyId, id)
  items.forEach(assertItemShape)
  await assertRecipesInCompany(companyId, items)

  await prisma.$transaction(async (tx) => {
    await tx.dietPlanItem.deleteMany({ where: { dietPlanId: id, dayOfWeek } })
    if (items.length) {
      await tx.dietPlanItem.createMany({
        data: items.map((item) => ({ ...item, companyId, dietPlanId: id, dayOfWeek })),
      })
    }
  })

  return findScoped(companyId, id)
}

/** Duplicates a plan and its whole week — the "copy last week" action. */
export const copyPlan = async (companyId, id, createdById, { name }) => {
  const source = await findScoped(companyId, id)

  return prisma.dietPlan.create({
    data: {
      companyId,
      createdById,
      name: name ?? `${source.name} (copy)`,
      description: source.description,
      notes: source.notes,
      items: {
        create: source.items.map((item) => ({
          companyId,
          dayOfWeek: item.dayOfWeek,
          mealType: item.mealType,
          sortOrder: item.sortOrder,
          recipeId: item.recipeId,
          customTitle: item.customTitle,
          customInstructions: item.customInstructions,
          notes: item.notes,
        })),
      },
    },
    include: planInclude,
  })
}

export const setPlanActive = async (companyId, id, isActive) => {
  await findScoped(companyId, id)
  return prisma.dietPlan.update({ where: { id }, data: { isActive }, include: planInclude })
}

/**
 * Assigns the plan to one or more clients. Client ids are checked against the
 * tenant, so a plan can never be pushed to another company's client.
 */
export const assignPlan = async (companyId, id, clientIds, assignedById, { startDate, endDate } = {}) => {
  await findScoped(companyId, id)

  if (clientIds.length) {
    const clients = await prisma.client.findMany({ where: { id: { in: clientIds }, companyId } })
    if (clients.length !== clientIds.length) {
      throw badRequest('One or more clients are not in this workspace', { clientIds: 'Unknown client' })
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.dietPlanAssignment.deleteMany({ where: { companyId, dietPlanId: id } })
    if (clientIds.length) {
      await tx.dietPlanAssignment.createMany({
        data: clientIds.map((clientId) => ({
          companyId,
          dietPlanId: id,
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

/** The plans one client can see — what the client portal reads. */
export const listPlansForClient = async (companyId, clientId) =>
  prisma.dietPlan.findMany({
    where: { companyId, isActive: true, assignments: { some: { clientId, isActive: true } } },
    include: planInclude,
    orderBy: { createdAt: 'desc' },
  })
