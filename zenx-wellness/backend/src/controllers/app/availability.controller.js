import * as availabilityService from '../../services/app/availability.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

const cid = (req) => req.tenant.companyId

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await availabilityService.listAvailability(cid(req), req.params.userId) })
})

export const set = asyncHandler(async (req, res) => {
  const data = await availabilityService.setAvailability(cid(req), req.params.userId, req.body)
  res.json({ success: true, message: 'Availability updated', data })
})

export const listBlocks = asyncHandler(async (req, res) => {
  const data = await availabilityService.listBlocks(cid(req), req.params.userId, req.validatedQuery)
  res.json({ success: true, data })
})

export const createBlock = asyncHandler(async (req, res) => {
  const data = await availabilityService.createBlock(cid(req), req.params.userId, req.body)
  res.status(201).json({ success: true, data })
})

export const deleteBlock = asyncHandler(async (req, res) => {
  const data = await availabilityService.deleteBlock(cid(req), req.params.userId, req.params.blockId)
  res.json({ success: true, message: 'Block removed', data })
})

/** Free/busy probe the Phase 2D scheduler will call before booking. */
export const check = asyncHandler(async (req, res) => {
  const { at, durationMinutes } = req.validatedQuery
  const data = await availabilityService.isStaffAvailableAt(cid(req), req.params.userId, at, durationMinutes)
  res.json({ success: true, data })
})

export const slots = asyncHandler(async (req, res) => {
  const { date, durationMinutes } = req.validatedQuery
  const data = await availabilityService.getSlotsForDate(cid(req), req.params.userId, date, durationMinutes)
  res.json({ success: true, data })
})
