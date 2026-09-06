import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateStaff } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { createEnquiry, listEnquiries, getEnquiry, patchEnquiry, updateEnquiryStatusHandler } from '../controllers/enquiry.controller.js';
import { createEnquirySchema, patchEnquirySchema, updateEnquiryStatusSchema } from '../schemas/enquiry.schema.js';

export const enquiryRouter = Router();

// Public — the marketing site's contact form. Rate-limited the same way wellness-app limits its
// own equivalent public enquiry route.
const createEnquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many enquiries submitted. Please try again in a while.' },
});
enquiryRouter.post('/', createEnquiryLimiter, validate(createEnquirySchema), createEnquiry);

// RLS granted enquiries CRUD (no delete) to every active admin regardless of role — no
// authorize(...) gate here, unlike companies/users/applications below.
enquiryRouter.use(authenticateStaff);
enquiryRouter.get('/', listEnquiries);
enquiryRouter.get('/:id', getEnquiry);
enquiryRouter.patch('/:id', validate(patchEnquirySchema), patchEnquiry);
enquiryRouter.patch('/:id/status', validate(updateEnquiryStatusSchema), updateEnquiryStatusHandler);
