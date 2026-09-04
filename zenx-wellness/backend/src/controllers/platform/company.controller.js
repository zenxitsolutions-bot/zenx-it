import * as companyService from '../../services/platform/company.service.js'
import * as domainService from '../../services/platform/domain.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

export const list = asyncHandler(async (req, res) => {
  const { page, pageSize, search } = req.validatedQuery
  const { accountStatus } = req.query
  res.json({
    success: true,
    data: await companyService.listCompanies({ page, pageSize, search, accountStatus }),
  })
})

export const get = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await companyService.getCompany(req.params.id) })
})

export const create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await companyService.createCompany(req.body) })
})

export const update = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await companyService.updateCompany(req.params.id, req.body) })
})

export const setStatus = asyncHandler(async (req, res) => {
  const data = await companyService.setCompanyStatus(req.params.id, req.body.accountStatus)
  res.json({ success: true, message: `Company is now ${req.body.accountStatus}`, data })
})

export const listDomains = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await domainService.listDomains(req.params.id) })
})

export const addDomain = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await domainService.addDomain(req.params.id, req.body) })
})

export const updateDomain = asyncHandler(async (req, res) => {
  const data = await domainService.updateDomain(req.params.id, req.params.domainId, req.body)
  res.json({ success: true, data })
})
