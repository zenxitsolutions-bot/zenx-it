import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  const status = err instanceof ApiError ? err.status : err.status || 500;
  const message = status === 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  if (status === 500) console.error(err);
  res.status(status).json({ error: message, details: err.details });
}
