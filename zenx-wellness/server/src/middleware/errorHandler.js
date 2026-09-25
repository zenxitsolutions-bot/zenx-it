import { ApiError } from '../utils/ApiError.js';
import { safeErrorMeta } from '../utils/safeError.js';

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.path}`));
}

export function errorHandler(err, req, res, next) {
  // A failed file stream cannot be replaced after bytes were sent. Before that point,
  // override any image/PDF MIME left by the file handler so JSON stays machine-readable.
  if (res.headersSent) return next(err);
  res.type('application/json');
  const reportedStatus = Number(err.status);
  const status = Number.isInteger(reportedStatus) && reportedStatus >= 400 && reportedStatus <= 599 ? reportedStatus : 500;
  const message = status >= 500 ? 'Internal server error' : err instanceof ApiError ? err.message
    : ({ 400: 'Invalid request', 413: 'Request too large', 415: 'Unsupported media type', 429: 'Too many requests' }[status] || 'Request failed');
  if (status >= 500) console.error('[request] failed', safeErrorMeta(err));
  res.status(status).json({ error: message, ...(err instanceof ApiError && status < 500 && err.details ? { details: err.details } : {}) });
}
