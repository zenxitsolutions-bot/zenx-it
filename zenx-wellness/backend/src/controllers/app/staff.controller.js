import * as staffService from '../../services/app/staff.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

const cid = (req) => req.tenant.companyId

/** Both dietitian and trainer routers mount this, differing only by kind. */
export const makeStaffController = (kind) => ({
  list: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await staffService.listStaff(kind, cid(req), req.validatedQuery) })
  }),

  get: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await staffService.getStaff(kind, cid(req), req.params.id) })
  }),

  create: asyncHandler(async (req, res) => {
    res.status(201).json({ success: true, data: await staffService.createStaff(kind, cid(req), req.body) })
  }),

  update: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await staffService.updateStaff(kind, cid(req), req.params.id, req.body) })
  }),

  setStatus: asyncHandler(async (req, res) => {
    const data = await staffService.setStaffStatus(kind, cid(req), req.params.id, req.body.status)
    res.json({ success: true, message: `${kind.label} is now ${req.body.status}`, data })
  }),

  assignedClients: asyncHandler(async (req, res) => {
    const profile = await staffService.getStaff(kind, cid(req), req.params.id)
    const data = await staffService.listAssignedClients(kind, cid(req), profile.userId, req.validatedQuery)
    res.json({ success: true, data })
  }),
})
