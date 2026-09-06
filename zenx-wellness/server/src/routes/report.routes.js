import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { listReports, createReport, addReportFeedback, deleteReport, getReportFile } from '../controllers/report.controller.js';
import { addReportFeedbackSchema } from '../schemas/report.schema.js';

export const reportRouter = Router();
reportRouter.use(authenticate, blockIfMustChangePassword);

reportRouter.get('/', listReports);
reportRouter.post('/', authorize('client'), upload.single('file'), createReport);
// Permission-checked inside the controller (per-role, same pattern as listReports above) rather
// than a route-level authorize() — every role can reach this route, but which reports they can
// actually open depends on ownership, not just role.
reportRouter.get('/:id/file', getReportFile);
reportRouter.post(
  '/:id/feedback',
  authorize('dietitian', 'admin'),
  validate(addReportFeedbackSchema),
  addReportFeedback
);
reportRouter.delete('/:id', deleteReport);
