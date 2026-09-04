import { Router } from 'express'
import { makeStaffController } from '../../controllers/app/staff.controller.js'
import * as availabilityController from '../../controllers/app/availability.controller.js'
import { authorize } from '../../middleware/rbac.middleware.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.middleware.js'
import { idParamSchema, paginationSchema } from '../../validators/common.validator.js'
import {
  createStaffSchema,
  staffListQuerySchema,
  staffStatusSchema,
  updateStaffSchema,
} from '../../validators/app/staff.validator.js'
import {
  availabilityCheckSchema,
  blockListQuerySchema,
  createBlockSchema,
  setAvailabilitySchema,
  slotsQuerySchema,
} from '../../validators/app/availability.validator.js'
import { z } from 'zod'
import { uuid } from '../../validators/common.validator.js'

const userParamSchema = z.object({ userId: uuid })
const blockParamSchema = z.object({ userId: uuid, blockId: uuid })

/**
 * Builds the dietitian or trainer router. Availability hangs off the staff
 * member's *user* id, since it is shared by both kinds and consumed by the
 * scheduler without caring which profile the person holds.
 */
export const makeStaffRouter = (kind, permissionPrefix) => {
  const controller = makeStaffController(kind)
  const router = Router()

  router.get('/', authorize(`${permissionPrefix}.view`), validateQuery(staffListQuerySchema), controller.list)
  router.post('/', authorize(`${permissionPrefix}.create`), validateBody(createStaffSchema), controller.create)
  router.get('/:id', authorize(`${permissionPrefix}.view`), validateParams(idParamSchema), controller.get)
  router.patch(
    '/:id',
    authorize(`${permissionPrefix}.edit`),
    validateParams(idParamSchema),
    validateBody(updateStaffSchema),
    controller.update,
  )
  router.patch(
    '/:id/status',
    authorize(`${permissionPrefix}.deactivate`),
    validateParams(idParamSchema),
    validateBody(staffStatusSchema),
    controller.setStatus,
  )
  router.get(
    '/:id/clients',
    authorize('clients.view'),
    validateParams(idParamSchema),
    validateQuery(paginationSchema),
    controller.assignedClients,
  )

  return router
}

/** Availability router, mounted once and shared by both staff kinds. */
export const availabilityRouter = () => {
  const router = Router()

  router.get(
    '/:userId',
    authorize('appointments.view'),
    validateParams(userParamSchema),
    availabilityController.list,
  )
  router.put(
    '/:userId',
    authorize('appointments.manage_availability'),
    validateParams(userParamSchema),
    validateBody(setAvailabilitySchema),
    availabilityController.set,
  )

  router.get(
    '/:userId/blocks',
    authorize('appointments.view'),
    validateParams(userParamSchema),
    validateQuery(blockListQuerySchema),
    availabilityController.listBlocks,
  )
  router.post(
    '/:userId/blocks',
    authorize('appointments.manage_availability'),
    validateParams(userParamSchema),
    validateBody(createBlockSchema),
    availabilityController.createBlock,
  )
  router.delete(
    '/:userId/blocks/:blockId',
    authorize('appointments.manage_availability'),
    validateParams(blockParamSchema),
    availabilityController.deleteBlock,
  )

  router.get(
    '/:userId/check',
    authorize('appointments.view'),
    validateParams(userParamSchema),
    validateQuery(availabilityCheckSchema),
    availabilityController.check,
  )
  router.get(
    '/:userId/slots',
    authorize('appointments.view'),
    validateParams(userParamSchema),
    validateQuery(slotsQuerySchema),
    availabilityController.slots,
  )

  return router
}
