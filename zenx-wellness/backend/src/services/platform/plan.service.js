import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'

const notFound = () => new ApiError(404, 'Subscription plan not found')

export const listPlans = async ({ includeInactive = false } = {}) =>
  prisma.subscriptionPlan.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { createdAt: 'asc' },
  })

export const getPlan = async (id) => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } })
  if (!plan) throw notFound()
  return plan
}

export const createPlan = async (data) => {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { name: data.name } })
  if (existing) throw badRequest('A plan with that name already exists', { name: 'Already in use' })

  return prisma.subscriptionPlan.create({ data })
}

export const updatePlan = async (id, data) => {
  await getPlan(id)

  if (data.name) {
    const clash = await prisma.subscriptionPlan.findFirst({
      where: { name: data.name, id: { not: id } },
    })
    if (clash) throw badRequest('A plan with that name already exists', { name: 'Already in use' })
  }

  return prisma.subscriptionPlan.update({ where: { id }, data })
}

/**
 * Plans are deactivated rather than deleted — existing subscriptions still
 * reference them and their history has to stay readable.
 */
export const deactivatePlan = async (id) => {
  await getPlan(id)
  return prisma.subscriptionPlan.update({ where: { id }, data: { isActive: false } })
}

export const activatePlan = async (id) => {
  await getPlan(id)
  return prisma.subscriptionPlan.update({ where: { id }, data: { isActive: true } })
}
