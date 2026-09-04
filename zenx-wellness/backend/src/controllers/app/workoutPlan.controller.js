import * as workoutPlanService from '../../services/app/workoutPlan.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

const cid = (req) => req.tenant.companyId

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await workoutPlanService.listPlans(cid(req), req.validatedQuery) })
})

export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await workoutPlanService.getPlan(cid(req), req.params.id) })
})

export const create = asyncHandler(async (req, res) => {
  const data = await workoutPlanService.createPlan(cid(req), req.user.id, req.body)
  res.status(201).json({ success: true, data })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await workoutPlanService.updatePlan(cid(req), req.params.id, req.body) })
})

export const setActive = asyncHandler(async (req, res) => {
  const data = await workoutPlanService.setPlanActive(cid(req), req.params.id, req.body.isActive)
  res.json({ success: true, data })
})

export const assign = asyncHandler(async (req, res) => {
  const { clientIds, startDate, endDate } = req.body
  const data = await workoutPlanService.assignPlan(cid(req), req.params.id, clientIds, req.user.id, {
    startDate,
    endDate,
  })
  res.json({ success: true, message: 'Plan assigned', data })
})
