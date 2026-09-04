import * as dietPlanService from '../../services/app/dietPlan.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

const cid = (req) => req.tenant.companyId

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await dietPlanService.listPlans(cid(req), req.validatedQuery) })
})

export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await dietPlanService.getPlan(cid(req), req.params.id) })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await dietPlanService.createPlan(cid(req), req.user.id, req.body) })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await dietPlanService.updatePlan(cid(req), req.params.id, req.body) })
})

export const setDay = asyncHandler(async (req, res) => {
  const dayOfWeek = Number(req.params.dayOfWeek)
  const data = await dietPlanService.setPlanDay(cid(req), req.params.id, dayOfWeek, req.body.items)
  res.json({ success: true, message: 'Day updated', data })
})

export const copy = asyncHandler(async (req, res) => {
  const data = await dietPlanService.copyPlan(cid(req), req.params.id, req.user.id, req.body)
  res.status(201).json({ success: true, message: 'Plan copied', data })
})

export const setActive = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await dietPlanService.setPlanActive(cid(req), req.params.id, req.body.isActive) })
})

export const assign = asyncHandler(async (req, res) => {
  const { clientIds, startDate, endDate } = req.body
  const data = await dietPlanService.assignPlan(cid(req), req.params.id, clientIds, req.user.id, { startDate, endDate })
  res.json({ success: true, message: 'Plan assigned', data })
})
