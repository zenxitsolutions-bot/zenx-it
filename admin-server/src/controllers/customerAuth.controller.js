import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signCustomerAccessToken, signCustomerRefreshToken, verifyCustomerRefreshToken } from '../utils/jwt.js';
import { findUserByEmail, findUserById, updateUserPassword, touchUserLastLogin } from '../models/ZenxUser.js';
import { findCompanyById } from '../models/Company.js';
import { findApplicationAccess, listActiveGrantsForUser } from '../models/ApplicationAccess.js';
import { findApplicationBySlug, listApplications } from '../models/Application.js';

const REFRESH_COOKIE = 'zenxcustomer_refresh';

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/api/customer-auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function issueTokens(res, user) {
  const accessToken = signCustomerAccessToken(user);
  const refreshToken = signCustomerRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  return accessToken;
}

function toClientShape(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !(await comparePassword(password, user.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('This account has been disabled.');

  await touchUserLastLogin(user.id);
  const accessToken = issueTokens(res, user);
  res.json({ user: toClientShape(user), accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('Missing refresh token');

  let payload;
  try {
    payload = verifyCustomerRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await findUserById(payload.sub);
  if (!user || user.status !== 'ACTIVE') throw ApiError.unauthorized('Account no longer available');

  const accessToken = signCustomerAccessToken(user);
  res.json({ accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/customer-auth' });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: toClientShape(req.customer) });
});

// Self-service — the customer picks their own password, clearing must_change_password (set by
// provisioning/set-password below). Requires the current session, not a reset-token flow.
export const setNewPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const updated = await updateUserPassword(req.customer.id, await hashPassword(password), false);
  res.json({ user: toClientShape(updated) });
});

// Powers the Launcher screen (pick among multiple ACTIVE application grants) — replaces the
// frontend joining application_access_public + applications_public + companies itself.
export const getActiveGrants = asyncHandler(async (req, res) => {
  const grants = await listActiveGrantsForUser(req.customer.id);
  const applications = await listApplications();
  const companiesById = new Map();
  for (const grant of grants) {
    if (!companiesById.has(grant.company_id)) {
      companiesById.set(grant.company_id, await findCompanyById(grant.company_id));
    }
  }
  res.json(
    grants.map((grant) => ({
      grant,
      application: applications.find((a) => a.slug === grant.application) ?? null,
      company: companiesById.get(grant.company_id) ?? null,
    }))
  );
});

// Replaces issue-app-handoff. Identity is re-derived entirely from req.customer (the verified
// session), never trusted from the request body — matching the Deno function's own approach.
// The claim shape below MUST match wellness-app's verifyHandoffToken/auth.controller.js#handoff
// byte-for-byte (sub, email, contact_name, role, company_id, company_slug, company_name,
// website, logo_url, jti) — this was proven end-to-end against a live wellness-app instance
// before this endpoint existed; any drift here breaks the handoff silently on the receiving side.
// `website` was added after the fact and is read defensively there (a token minted before this
// claim existed simply leaves the mirrored value untouched), so the two sides can deploy in
// either order.
export const issueHandoffToken = asyncHandler(async (req, res) => {
  const { applicationSlug, companyId } = req.body;

  const company = await findCompanyById(companyId);
  if (!company || company.status !== 'ACTIVE') throw ApiError.forbidden("You don't have access to this company.");

  const grant = await findApplicationAccess(req.customer.id, companyId, applicationSlug);
  if (!grant || grant.status !== 'ACTIVE') throw ApiError.forbidden("You don't have access to this application.");

  const application = await findApplicationBySlug(applicationSlug);
  if (!application?.url || !application?.handoff_secret) {
    throw ApiError.conflict('This application is not deployed yet.');
  }

  const token = jwt.sign(
    {
      sub: req.customer.id,
      email: req.customer.email,
      contact_name: `${req.customer.first_name} ${req.customer.last_name}`.trim(),
      role: grant.role,
      company_id: company.id,
      company_slug: company.company_slug,
      company_name: company.company_name,
      website: company.website ?? null,
      logo_url: company.logo_url ?? null,
      jti: randomUUID(),
    },
    application.handoff_secret,
    { expiresIn: '60s' }
  );

  res.json({ url: `${application.url}/${company.company_slug}/handoff?token=${token}` });
});
