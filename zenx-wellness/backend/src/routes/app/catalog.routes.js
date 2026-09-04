import { Router } from 'express'
import { makeCatalogController } from '../../controllers/app/catalog.controller.js'
import { authorize } from '../../middleware/rbac.middleware.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.middleware.js'
import { idParamSchema } from '../../validators/common.validator.js'
import { activeSchema } from '../../validators/app/catalog.validator.js'

/** Recipes and exercises share this router shape. */
export const makeCatalogRouter = (catalog, permissionPrefix, { listQuery, createSchema, updateSchema }) => {
  const controller = makeCatalogController(catalog)
  const router = Router()

  router.get('/', authorize(`${permissionPrefix}.view`), validateQuery(listQuery), controller.list)
  router.post('/', authorize(`${permissionPrefix}.create`), validateBody(createSchema), controller.create)
  router.get('/:id', authorize(`${permissionPrefix}.view`), validateParams(idParamSchema), controller.get)
  router.patch(
    '/:id',
    authorize(`${permissionPrefix}.edit`),
    validateParams(idParamSchema),
    validateBody(updateSchema),
    controller.update,
  )
  router.patch(
    '/:id/status',
    authorize(`${permissionPrefix}.deactivate`),
    validateParams(idParamSchema),
    validateBody(activeSchema),
    controller.setActive,
  )

  return router
}
