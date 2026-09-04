import * as userService from '../../services/app/user.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

export const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await userService.listUsers(req.tenant.companyId, req.validatedQuery) })
})

export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await userService.getUser(req.tenant.companyId, req.params.id) })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await userService.createUser(req.tenant.companyId, req.body) })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await userService.updateUser(req.tenant.companyId, req.params.id, req.body) })
})

export const setStatus = asyncHandler(async (req, res) => {
  const data = await userService.setUserStatus(
    req.tenant.companyId,
    req.params.id,
    req.body.status,
    req.user.id,
  )
  res.json({ success: true, message: `User is now ${req.body.status}`, data })
})

export const assignRoles = asyncHandler(async (req, res) => {
  const data = await userService.assignRoles(req.tenant.companyId, req.params.id, req.body.roleIds)
  res.json({ success: true, message: 'Roles updated', data })
})

export const resetPassword = asyncHandler(async (req, res) => {
  const data = await userService.resetPassword(req.tenant.companyId, req.params.id)
  res.json({ success: true, message: 'Temporary password issued', data })
})
