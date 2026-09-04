import prisma from '../../config/prisma.js'
import { ApiError } from '../../utils/ApiError.js'

const include = {
  plan: { select: { id: true, name: true, features: true } },
  company: { select: { id: true, name: true, slug: true } },
}

export const listSubscriptions = async ({ companyId, status } = {}) =>
  prisma.subscription.findMany({
    where: { ...(companyId ? { companyId } : {}), ...(status ? { status } : {}) },
    include,
    orderBy: { createdAt: 'desc' },
  })

export const getSubscription = async (id) => {
  const subscription = await prisma.subscription.findUnique({ where: { id }, include })
  if (!subscription) throw new ApiError(404, 'Subscription not found')
  return subscription
}

export const createSubscription = async (data) => {
  const [company, plan] = await Promise.all([
    prisma.company.findUnique({ where: { id: data.companyId } }),
    prisma.subscriptionPlan.findUnique({ where: { id: data.planId } }),
  ])

  if (!company) throw new ApiError(404, 'Company not found')
  if (!plan) throw new ApiError(404, 'Subscription plan not found')

  return prisma.subscription.create({ data, include })
}

export const updateSubscription = async (id, data) => {
  const current = await getSubscription(id)

  if (data.planId) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } })
    if (!plan) throw new ApiError(404, 'Subscription plan not found')
  }

  const startDate = data.startDate ?? current.startDate
  const endDate = data.endDate ?? current.endDate
  if (endDate <= startDate) {
    throw new ApiError(400, 'End date must be after the start date')
  }

  return prisma.subscription.update({ where: { id }, data, include })
}
