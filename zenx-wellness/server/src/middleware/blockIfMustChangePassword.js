import { ApiError } from '../utils/ApiError.js';

// Mounted on every protected router except the three auth escape hatches
// (POST /auth/change-password, GET /auth/me, POST /auth/logout) — see auth.routes.js. Must run
// after `authenticate` so req.user is populated.
export const blockIfMustChangePassword = (req, res, next) => {
  if (req.user.mustChangePassword) {
    return next(ApiError.forbidden('Password change required before continuing'));
  }
  next();
};
