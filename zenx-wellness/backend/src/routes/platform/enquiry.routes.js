import { Router } from 'express'
import { z } from 'zod'
import * as enquiryController from '../../controllers/platform/enquiry.controller.js'
import { attachPlatformAdmin } from '../../middleware/platformAdmin.middleware.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.middleware.js'
import { idParamSchema, uuid } from '../../validators/common.validator.js'
import {
  assignEnquirySchema,
  convertEnquirySchema,
  createEnquirySchema,
  createFollowUpSchema,
  enquiryCommentSchema,
  enquiryListQuerySchema,
  updateEnquirySchema,
  updateFollowUpSchema,
} from '../../validators/platform/enquiry.validator.js'

const router = Router()

const followUpParamSchema = z.object({ id: uuid, followUpId: uuid })

// Fixed segments first so they aren't captured by /:id.
router.get('/assignees', enquiryController.assignees)
router.get('/reminders/due', enquiryController.dueReminders)

router.get('/', validateQuery(enquiryListQuerySchema), enquiryController.list)
router.post('/', validateBody(createEnquirySchema), enquiryController.create)
router.get('/:id', validateParams(idParamSchema), enquiryController.get)
router.patch('/:id', validateParams(idParamSchema), validateBody(updateEnquirySchema), enquiryController.update)

router.patch(
  '/:id/assign',
  validateParams(idParamSchema),
  validateBody(assignEnquirySchema),
  enquiryController.assign,
)

router.get('/:id/comments', validateParams(idParamSchema), enquiryController.listComments)
router.post(
  '/:id/comments',
  validateParams(idParamSchema),
  validateBody(enquiryCommentSchema),
  attachPlatformAdmin,
  enquiryController.addComment,
)

router.get('/:id/followups', validateParams(idParamSchema), enquiryController.listFollowUps)
router.post(
  '/:id/followups',
  validateParams(idParamSchema),
  validateBody(createFollowUpSchema),
  attachPlatformAdmin,
  enquiryController.scheduleFollowUp,
)
router.patch(
  '/:id/followups/:followUpId',
  validateParams(followUpParamSchema),
  validateBody(updateFollowUpSchema),
  enquiryController.updateFollowUp,
)

router.post(
  '/:id/convert',
  validateParams(idParamSchema),
  validateBody(convertEnquirySchema),
  enquiryController.convert,
)

export default router
