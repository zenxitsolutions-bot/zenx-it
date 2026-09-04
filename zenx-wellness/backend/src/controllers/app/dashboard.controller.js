import * as dashboardService from '../../services/app/dashboard.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

export const summary = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await dashboardService.getSummary(req.tenant.companyId) })
})
