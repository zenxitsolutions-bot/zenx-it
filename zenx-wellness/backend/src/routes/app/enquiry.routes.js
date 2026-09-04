import { Router } from 'express'
import { z } from 'zod'
import * as enquiryController from '../../controllers/app/enquiry.controller.js'
import { authorize } from '../../middleware/rbac.middleware.js'
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.middleware.js'
import { idParamSchema, uuid } from '../../validators/common.validator.js'
import {
  assignEnquirySchema,
  commentSchema,
  convertEnquirySchema,
  createEnquirySchema,
  createFollowUpSchema,
  enquiryListQuerySchema,
  updateEnquirySchema,
  updateFollowUpSchema,
} from '../../validators/app/enquiry.validator.js'

const router = Router()

const followUpParamSchema = z.object({ id: uuid, followUpId: uuid })

router.get('/reminders/due', authorize('enquiries.view'), enquiryController.dueReminders)

router.get('/', authorize('enquiries.view'), validateQuery(enquiryListQuerySchema), enquiryController.list)
router.post('/', authorize('enquiries.create'), validateBody(createEnquirySchema), enquiryController.create)
router.get('/:id', authorize('enquiries.view'), validateParams(idParamSchema), enquiryController.get)
router.patch(
  '/:id',
  authorize('enquiries.edit'),
  validateParams(idParamSchema),
  validateBody(updateEnquirySchema),
  enquiryController.update,
)
router.patch(
  '/:id/assign',
  authorize('enquiries.assign'),
  validateParams(idParamSchema),
  validateBody(assignEnquirySchema),
  enquiryController.assign,
)

router.get('/:id/comments', authorize('enquiries.view'), validateParams(idParamSchema), enquiryController.listComments)
router.post(
  '/:id/comments',
  authorize('enquiries.edit'),
  validateParams(idParamSchema),
  validateBody(commentSchema),
  enquiryController.addComment,
)

router.get('/:id/followups', authorize('enquiries.view'), validateParams(idParamSchema), enquiryController.listFollowUps)
router.post(
  '/:id/followups',
  authorize('enquiries.edit'),
  validateParams(idParamSchema),
  validateBody(createFollowUpSchema),
  enquiryController.scheduleFollowUp,
)
router.patch(
  '/:id/followups/:followUpId',
  authorize('enquiries.edit'),
  validateParams(followUpParamSchema),
  validateBody(updateFollowUpSchema),
  enquiryController.updateFollowUp,
)

// Reading the prefill is an enquiry view; committing the conversion creates a
// client, so it needs the clients.create permission too.
router.get(
  '/:id/convert/prefill',
  authorize('enquiries.view'),
  validateParams(idParamSchema),
  enquiryController.conversionPrefill,
)
router.post(
  '/:id/convert',
  authorize('clients.create'),
  validateParams(idParamSchema),
  validateBody(convertEnquirySchema),
  enquiryController.convert,
)

export default router
