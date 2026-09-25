import { Router } from 'express';
import { requirePermission } from '../middleware/permissions.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { listReports, createReport, addReportFeedback, deleteReport, getReportFile } from '../controllers/report.controller.js';
import { createReportSchema, addReportFeedbackSchema } from '../schemas/report.schema.js';

export const reportRouter = Router();
reportRouter.use(authenticate, blockIfMustChangePassword);

reportRouter.get('/', requirePermission('reports.view'), listReports);
reportRouter.post('/', authorize('client'), upload.single('file'), validate(createReportSchema), createReport);
// Permission-checked inside the controller (per-role, same pattern as listReports above) rather
// than a route-level authorize() — every role can reach this route, but which reports they can
// actually open depends on ownership, not just role.
reportRouter.get('/:id/file', requirePermission('reports.view'), getReportFile);
reportRouter.post(
  '/:id/feedback',
  requirePermission('reports.view', 'reports.review'),
  authorize('dietitian', 'admin'),
  validate(addReportFeedbackSchema),
  addReportFeedback
);
reportRouter.delete('/:id', requirePermission('reports.view', 'reports.review'), deleteReport);
