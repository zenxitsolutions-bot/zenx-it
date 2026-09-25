import { hasPermission } from '../../../shared/permissions.js';
import { ApiError } from '../utils/ApiError.js';

// Clients retain their existing self-service routes and ownership checks. These capabilities
// configure staff access; existing authorize(...) guards still exclude clients from staff APIs.
export function assertPermission(req, key) {
  if (!req.user) throw ApiError.unauthorized();
  if (req.user.role !== 'client' && !hasPermission(req.user, key)) throw ApiError.forbidden('You do not have permission for this action');
}
export const requirePermission = (...keys) => (req, _res, next) => {
  try { for (const key of keys) assertPermission(req, key); next(); } catch (error) { next(error); }
};
export const requireAnyPermission = (...keys) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role === 'client' || keys.some((key) => hasPermission(req.user, key))) return next();
  next(ApiError.forbidden('You do not have permission for this action'));
};
