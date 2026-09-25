import { Router } from 'express';
import { requirePermission } from '../middleware/permissions.js';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import {
  createEnquiry,
  listEnquiries,
  getEnquiry,
  updateEnquiry,
  deleteEnquiry,
  getEnquiryHistory,
} from '../controllers/enquiry.controller.js';
import {
  createEnquirySchema,
  updateEnquirySchema,
  listEnquiriesQuerySchema,
} from '../schemas/enquiry.schema.js';

export const enquiryRouter = Router();

const createEnquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many enquiries submitted. Please try again in a while.' },
});

enquiryRouter.post('/', createEnquiryLimiter, validate(createEnquirySchema), createEnquiry);
enquiryRouter.use(authenticate, blockIfMustChangePassword, authorize('admin'));
enquiryRouter.get('/', requirePermission('enquiries.view'), validate(listEnquiriesQuerySchema, 'query'), listEnquiries);
enquiryRouter.get('/:id', requirePermission('enquiries.view'), getEnquiry);
enquiryRouter.get('/:id/history', requirePermission('enquiries.view'), getEnquiryHistory);
enquiryRouter.patch('/:id', requirePermission('enquiries.view', 'enquiries.manage'), validate(updateEnquirySchema), updateEnquiry);
enquiryRouter.delete('/:id', requirePermission('enquiries.view', 'enquiries.manage'), deleteEnquiry);
