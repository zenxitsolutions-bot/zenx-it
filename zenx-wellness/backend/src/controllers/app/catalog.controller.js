import * as catalogService from '../../services/app/catalog.service.js'
import asyncHandler from '../../utils/asyncHandler.js'

const cid = (req) => req.tenant.companyId

/** Shared by the recipe and exercise routers. */
export const makeCatalogController = (catalog) => ({
  list: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await catalogService.listItems(catalog, cid(req), req.validatedQuery) })
  }),

  get: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await catalogService.getItem(catalog, cid(req), req.params.id) })
  }),

  create: asyncHandler(async (req, res) => {
    const data = await catalogService.createItem(catalog, cid(req), req.user.id, req.body)
    res.status(201).json({ success: true, data })
  }),

  update: asyncHandler(async (req, res) => {
    const data = await catalogService.updateItem(catalog, cid(req), req.params.id, req.body)
    res.json({ success: true, data })
  }),

  setActive: asyncHandler(async (req, res) => {
    const data = await catalogService.setItemActive(catalog, cid(req), req.params.id, req.body.isActive)
    res.json({ success: true, data })
  }),
})
