import { ApiError } from '../utils/ApiError.js';

// Manager gate — Super Admin/Admin only, matching RLS's is_admin_manager(): Sales/Support can
// read everything but not write to profiles/companies/users/applications/application_access.
export const authorize = (...roles) => (req, res, next) => {
  if (!req.staff) return next(ApiError.unauthorized());
  if (!roles.includes(req.staff.role)) return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`));
  next();
};
