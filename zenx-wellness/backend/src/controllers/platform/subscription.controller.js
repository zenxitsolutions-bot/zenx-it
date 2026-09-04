import * as subscriptionService from '../../services/platform/subscription.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

export const list = asyncHandler(async (req, res) => {
  const { companyId, status } = req.query
  res.json({ success: true, data: await subscriptionService.listSubscriptions({ companyId, status }) })
})

export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await subscriptionService.getSubscription(req.params.id) })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await subscriptionService.createSubscription(req.body) })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await subscriptionService.updateSubscription(req.params.id, req.body) })
})
