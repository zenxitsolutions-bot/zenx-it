import { Router } from 'express';
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
enquiryRouter.get('/', validate(listEnquiriesQuerySchema, 'query'), listEnquiries);
enquiryRouter.get('/:id', getEnquiry);
enquiryRouter.get('/:id/history', getEnquiryHistory);
enquiryRouter.patch('/:id', validate(updateEnquirySchema), updateEnquiry);
enquiryRouter.delete('/:id', deleteEnquiry);
