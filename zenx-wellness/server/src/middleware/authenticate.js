import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { findUserById } from '../models/User.js';
import { findCompanyById } from '../models/Company.js';
import { asyncHandler } from './asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized('Missing access token');

  let payload;
  try {
    payload = verifyAccessToken(header.slice('Bearer '.length));
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }

  const user = await findUserById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  // Checked on every request, not just at login, so a suspension (see the account_status comment
  // in schema.sql) takes effect immediately for an already-signed-in session — not just on their
  // next login attempt.
  if (user.accountStatus === 'suspended') throw ApiError.forbidden('This account has been suspended. Contact an administrator.');
  if (user.role === 'client' && user.accountStatus === 'inactive') {
    throw ApiError.forbidden('This account is no longer active. Contact your administrator.');
  }

  // Tenant identity is the company on the user row in the database — never a companyId the
  // browser sent. If the access token also carries companyId (issued after login), it must
  // still match; a mismatch means the user was moved between tenants and this session is stale.
  if (payload.companyId && payload.companyId !== user.companyId) {
    throw ApiError.unauthorized('Session is no longer valid for this company.');
  }

  if (user.companyId) {
    const company = await findCompanyById(user.companyId);
    if (!company || company.status !== 'ACTIVE') {
      throw ApiError.forbidden('This company account is not active. Contact your administrator.');
    }
  }

  req.user = user;
  next();
});
