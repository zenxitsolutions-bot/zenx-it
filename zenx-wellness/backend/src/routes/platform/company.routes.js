import { Router } from 'express'
import * as companyController from '../../controllers/platform/company.controller.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.middleware.js'
import { idParamSchema, paginationSchema, uuid } from '../../validators/common.validator.js'
import { z } from 'zod'
import {
  companyStatusSchema,
  createCompanySchema,
  updateCompanySchema,
} from '../../validators/platform/company.validator.js'
import {
  createDomainSchema,
  updateDomainSchema,
} from '../../validators/platform/domain.validator.js'

const router = Router()

const domainParamSchema = z.object({ id: uuid, domainId: uuid })

router.get('/', validateQuery(paginationSchema), companyController.list)
router.post('/', validateBody(createCompanySchema), companyController.create)
router.get('/:id', validateParams(idParamSchema), companyController.get)
router.patch('/:id', validateParams(idParamSchema), validateBody(updateCompanySchema), companyController.update)
router.patch(
  '/:id/status',
  validateParams(idParamSchema),
  validateBody(companyStatusSchema),
  companyController.setStatus,
)

router.get('/:id/domains', validateParams(idParamSchema), companyController.listDomains)
router.post(
  '/:id/domains',
  validateParams(idParamSchema),
  validateBody(createDomainSchema),
  companyController.addDomain,
)
router.patch(
  '/:id/domains/:domainId',
  validateParams(domainParamSchema),
  validateBody(updateDomainSchema),
  companyController.updateDomain,
)

export default router
