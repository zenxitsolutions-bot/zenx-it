import * as planService from '../../services/platform/plan.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

export const list = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true'
  res.json({ success: true, data: await planService.listPlans({ includeInactive }) })
})

export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await planService.getPlan(req.params.id) })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await planService.createPlan(req.body) })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await planService.updatePlan(req.params.id, req.body) })
})

export const deactivate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await planService.deactivatePlan(req.params.id) })
})

export const activate = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await planService.activatePlan(req.params.id) })
})
