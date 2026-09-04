import * as roleService from '../../services/app/role.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

export const listPermissions = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await roleService.listPermissions() })
})

export const list = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true'
  res.json({ success: true, data: await roleService.listRoles(req.tenant.companyId, { includeInactive }) })
})

export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await roleService.getRole(req.tenant.companyId, req.params.id) })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await roleService.createRole(req.tenant.companyId, req.body) })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await roleService.updateRole(req.tenant.companyId, req.params.id, req.body) })
})

export const setPermissions = asyncHandler(async (req, res) => {
  const data = await roleService.setRolePermissions(req.tenant.companyId, req.params.id, req.body.permissions)
  res.json({ success: true, message: 'Permissions updated', data })
})

export const setActive = asyncHandler(async (req, res) => {
  const data = await roleService.setRoleActive(req.tenant.companyId, req.params.id, req.body.isActive)
  res.json({ success: true, data })
})
