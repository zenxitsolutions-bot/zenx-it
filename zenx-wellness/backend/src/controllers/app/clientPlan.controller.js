import prisma from '../../config/prisma.js'
import * as dietPlanService from '../../services/app/dietPlan.service.js'
import * as workoutPlanService from '../../services/app/workoutPlan.service.js'
import { ApiError, forbidden } from '../../utils/ApiError.js'
import asyncHandler from '../../utils/asyncHandler.js'

/**
 * A CLIENT-role user may only read their own record. Staff reads are already
 * gated by the diet_plans.view / workout_plans.view permissions.
 */
const assertMayRead = async (req) => {
  const companyId = req.tenant.companyId
  const client = await prisma.client.findFirst({ where: { id: req.params.id, companyId } })
  if (!client) throw new ApiError(404, 'Client not found')

  if (req.user.role === 'CLIENT' && client.userId !== req.user.id) {
    throw forbidden('You can only view your own plans')
  }

  return client
}

export const dietPlans = asyncHandler(async (req, res) => {
  const client = await assertMayRead(req)
  const data = await dietPlanService.listPlansForClient(req.tenant.companyId, client.id)
  res.json({ success: true, data })
})

export const workoutPlans = asyncHandler(async (req, res) => {
  const client = await assertMayRead(req)
  const data = await workoutPlanService.listPlansForClient(req.tenant.companyId, client.id)
  res.json({ success: true, data })
})
