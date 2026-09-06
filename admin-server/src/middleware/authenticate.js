import { verifyStaffAccessToken, verifyCustomerAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { findProfileById } from '../models/Profile.js';
import { findUserById } from '../models/ZenxUser.js';
import { findCompanyById } from '../models/Company.js';
import { listActiveGrantsForUser } from '../models/ApplicationAccess.js';
import { asyncHandler } from './asyncHandler.js';

function readBearer(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized('Missing access token');
  return header.slice('Bearer '.length);
}

// Same "must be active" check RLS's is_active_admin()/customer-status checks used to enforce —
// moved into app code, checked on every request (not just at login) so a DISABLED status takes
// effect immediately for an already-signed-in session.
export const authenticateStaff = asyncHandler(async (req, res, next) => {
  let payload;
  try {
    payload = verifyStaffAccessToken(readBearer(req));
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
  if (payload.kind !== 'staff') throw ApiError.unauthorized('Wrong token realm');

  const profile = await findProfileById(payload.sub);
  if (!profile) throw ApiError.unauthorized('User no longer exists');
  if (profile.status !== 'ACTIVE') throw ApiError.forbidden('This account has been disabled.');

  req.staff = profile;
  next();
});

export const authenticateCustomer = asyncHandler(async (req, res, next) => {
  let payload;
  try {
    payload = verifyCustomerAccessToken(readBearer(req));
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
  if (payload.kind !== 'customer') throw ApiError.unauthorized('Wrong token realm');

  const user = await findUserById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('This account has been disabled.');

  // Tenant on the session comes from the token minted at /:companySlug/login — never from a
  // companyId the browser posts later. Re-check the grant so a revoked company cannot keep using
  // an old access token.
  req.customer = user;
  req.customerCompanyId = payload.companyId || null;
  if (req.customerCompanyId) {
    const company = await findCompanyById(req.customerCompanyId);
    if (!company || company.status !== 'ACTIVE') {
      throw ApiError.forbidden('This company account is not active. Contact your administrator.');
    }
    const grants = await listActiveGrantsForUser(user.id);
    if (!grants.some((g) => g.company_id === req.customerCompanyId)) {
      throw ApiError.forbidden('This session is no longer valid for that company.');
    }
  }
  next();
});
