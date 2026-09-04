import * as enquiryService from '../../services/app/enquiry.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

const companyId = (req) => req.tenant.companyId

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.listEnquiries(companyId(req), req.validatedQuery) })
})

export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.getEnquiry(companyId(req), req.params.id) })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await enquiryService.createEnquiry(companyId(req), req.body) })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.updateEnquiry(companyId(req), req.params.id, req.body) })
})

export const assign = asyncHandler(async (req, res) => {
  const data = await enquiryService.assignEnquiry(companyId(req), req.params.id, req.body.assignedToId)
  res.json({ success: true, message: 'Assignment updated', data })
})

export const listComments = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.listComments(companyId(req), req.params.id) })
})

export const addComment = asyncHandler(async (req, res) => {
  // Authorship comes from the session, never the payload.
  const data = await enquiryService.addComment(companyId(req), req.params.id, req.user.id, req.body.body)
  res.status(201).json({ success: true, data })
})

export const listFollowUps = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.listFollowUps(companyId(req), req.params.id) })
})

export const scheduleFollowUp = asyncHandler(async (req, res) => {
  const data = await enquiryService.scheduleFollowUp(companyId(req), req.params.id, req.user.id, req.body)
  res.status(201).json({ success: true, data })
})

export const updateFollowUp = asyncHandler(async (req, res) => {
  const data = await enquiryService.updateFollowUp(
    companyId(req),
    req.params.id,
    req.params.followUpId,
    req.body,
  )
  res.json({ success: true, data })
})

export const dueReminders = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.listDueReminders(companyId(req)) })
})

export const conversionPrefill = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await enquiryService.getConversionPrefill(companyId(req), req.params.id) })
})

export const convert = asyncHandler(async (req, res) => {
  const data = await enquiryService.convertEnquiry(companyId(req), req.params.id, req.body)
  res.status(201).json({ success: true, message: 'Enquiry converted to client', data })
})
