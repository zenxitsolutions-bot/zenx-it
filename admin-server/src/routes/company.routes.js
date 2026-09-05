import { Router } from 'express';
import { authenticateStaff } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { uploadCompanyLogo } from '../middleware/upload.js';
import {
  getCompanies,
  getCompany,
  getCompanyApplicationAccess,
  getCompanyUsers,
  patchCompanyStatus,
  patchApplicationAccessStatus,
  setCustomerPassword,
  uploadLogo,
  removeLogo,
  getWellnessClients,
  patchWellnessDietitian,
  patchCompany,
} from '../controllers/company.controller.js';
import { checkCompanySlugAvailable, provisionCustomerAccount } from '../controllers/provisioning.controller.js';
import {
  setCompanyStatusSchema,
  setApplicationAccessSchema,
  setCustomerPasswordSchema,
  setWellnessDietitianSchema,
  updateCompanySchema,
} from '../schemas/company.schema.js';
import { provisionCustomerSchema } from '../schemas/provisioning.schema.js';

export const companyRouter = Router();

companyRouter.use(authenticateStaff);

// Manager-only writes, per the RLS "Support is read-only on companies/users/applications/
// application_access" rule — GETs below stay open to any active staff.
companyRouter.get('/', getCompanies);
companyRouter.get('/check-slug/:slug', checkCompanySlugAvailable);
companyRouter.post('/provision', authorize('Super Admin', 'Admin'), validate(provisionCustomerSchema), provisionCustomerAccount);
companyRouter.get('/:id', getCompany);
companyRouter.patch('/:id', authorize('Super Admin', 'Admin'), validate(updateCompanySchema), patchCompany);
companyRouter.get('/:id/application-access', getCompanyApplicationAccess);
companyRouter.get('/:id/users', getCompanyUsers);
companyRouter.get('/:id/wellness-clients', getWellnessClients);
companyRouter.patch(
  '/:id/wellness-clients/:userId/dietitian',
  authorize('Super Admin', 'Admin'),
  validate(setWellnessDietitianSchema),
  patchWellnessDietitian
);
companyRouter.patch('/:id/status', authorize('Super Admin', 'Admin'), validate(setCompanyStatusSchema), patchCompanyStatus);
// Flat, not nested under /:id — the caller (services/companies.ts#setApplicationAccess) only
// ever has the grant id in scope, matching the original Supabase call's own
// `.update().eq('id', accessId)` shape.
companyRouter.patch(
  '/application-access/:grantId',
  authorize('Super Admin', 'Admin'),
  validate(setApplicationAccessSchema),
  patchApplicationAccessStatus
);
companyRouter.patch(
  '/customers/:userId/password',
  authorize('Super Admin', 'Admin'),
  validate(setCustomerPasswordSchema),
  setCustomerPassword
);
companyRouter.post('/:id/logo', authorize('Super Admin', 'Admin'), uploadCompanyLogo.single('logo'), uploadLogo);
companyRouter.delete('/:id/logo', authorize('Super Admin', 'Admin'), removeLogo);
