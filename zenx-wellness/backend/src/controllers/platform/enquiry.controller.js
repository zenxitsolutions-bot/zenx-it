import * as enquiryService from '../../services/platform/enquiry.service.js'
import { listPlatformAdmins } from '../../services/platform/platformAdmin.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.listEnquiries(req.validatedQuery) })
})

export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.getEnquiry(req.params.id) })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await enquiryService.createEnquiry(req.body) })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.updateEnquiry(req.params.id, req.body) })
})

export const assign = asyncHandler(async (req, res) => {
  const data = await enquiryService.assignEnquiry(req.params.id, req.body.assignedToId)
  res.json({ success: true, message: 'Assignment updated', data })
})

export const listComments = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.listComments(req.params.id) })
})

export const addComment = asyncHandler(async (req, res) => {
  // Authorship comes from the session, never from the payload.
  const data = await enquiryService.addComment(req.params.id, req.platformAdmin.id, req.body.body)
  res.status(201).json({ success: true, data })
})

export const listFollowUps = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.listFollowUps(req.params.id) })
})

export const scheduleFollowUp = asyncHandler(async (req, res) => {
  const data = await enquiryService.scheduleFollowUp(req.params.id, req.platformAdmin.id, req.body)
  res.status(201).json({ success: true, data })
})

export const updateFollowUp = asyncHandler(async (req, res) => {
  const data = await enquiryService.updateFollowUp(req.params.id, req.params.followUpId, req.body)
  res.json({ success: true, data })
})

export const convert = asyncHandler(async (req, res) => {
  const data = await enquiryService.convertEnquiry(req.params.id, req.body)
  res.status(201).json({
    success: true,
    message: 'Enquiry converted — company workspace created',
    data,
  })
})

export const dueReminders = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await enquiryService.listDueReminders() })
})

export const assignees = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await listPlatformAdmins() })
})
