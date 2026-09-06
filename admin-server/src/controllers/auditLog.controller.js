import { asyncHandler } from '../middleware/asyncHandler.js';
import { listAuditLogs } from '../models/AuditLog.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  res.json(await listAuditLogs());
});
