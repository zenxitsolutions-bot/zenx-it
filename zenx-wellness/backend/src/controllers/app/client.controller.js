import * as clientService from '../../services/app/client.service.js'
import { clientScopeFilter } from '../../services/app/staff.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

export const list = asyncHandler(async (req, res) => {
  // Dietitians and trainers see only their own caseload.
  const scope = clientScopeFilter(req.user, req.permissions)
  const data = await clientService.listClients(req.tenant.companyId, req.validatedQuery, scope)
  res.json({ success: true, data })
})

export const get = asyncHandler(async (req, res) => {
  const scope = clientScopeFilter(req.user, req.permissions)
  const data = await clientService.getClient(req.tenant.companyId, req.params.id, scope)
  res.json({ success: true, data })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await clientService.createClient(req.tenant.companyId, req.body) })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await clientService.updateClient(req.tenant.companyId, req.params.id, req.body) })
})

export const setStatus = asyncHandler(async (req, res) => {
  const data = await clientService.setClientStatus(req.tenant.companyId, req.params.id, req.body.status)
  res.json({ success: true, message: `Client is now ${req.body.status}`, data })
})

export const assignStaff = asyncHandler(async (req, res) => {
  const data = await clientService.assignStaff(req.tenant.companyId, req.params.id, req.body)
  res.json({ success: true, message: 'Assignment updated', data })
})
