import { Router } from 'express';
import { authenticateStaff } from '../middleware/authenticate.js';
import { getAuditLogs } from '../controllers/auditLog.controller.js';

export const auditLogRouter = Router();

auditLogRouter.use(authenticateStaff);
auditLogRouter.get('/', getAuditLogs);
