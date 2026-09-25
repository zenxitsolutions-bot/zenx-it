import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signCustomerAccessToken, signCustomerRefreshToken, verifyCustomerRefreshToken, verifyCustomerAccessToken } from '../utils/jwt.js';
import { findUserByEmail, findUserById, updateUserPassword, touchUserLastLogin } from '../models/ZenxUser.js';
import { findCompanyById, findCompanyBySlug } from '../models/Company.js';
import { findApplicationAccess, listActiveGrantsForUser } from '../models/ApplicationAccess.js';
import { reconcileCompanyMainAdmin } from '../models/CompanyOwnership.js';
import { updateWellnessPassword, syncWellnessMainAdmin } from '../models/WellnessDb.js';
import { findApplicationBySlug, listApplications } from '../models/Application.js';
import { createSession, rotateSession, revokeRequestSessions, revokeAccountSessions } from '../models/AuthSession.js';
import { safeErrorMeta } from '../utils/safeError.js';
import { toPublicAccount as toClientShape, toPublicApplication } from '../utils/publicAccount.js';

const REFRESH_COOKIE = 'zenxcustomer_refresh';

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/api/customer-auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

async function issueTokens(res, user, companyId, previous = null) {
  const sid = previous?.sid || randomUUID();
  const accessToken = signCustomerAccessToken(user, companyId, sid);
  const refreshToken = signCustomerRefreshToken(user, companyId, sid);
  const expiresAt = new Date(verifyCustomerRefreshToken(refreshToken).exp * 1000);
  const session = { id: sid, kind: 'customer', accountId: user.id, companyId, passwordHash: user.password_hash, refreshToken, expiresAt };
  if (previous) {
    if (!(await rotateSession({ ...session, previousToken: previous.token }))) throw ApiError.unauthorized('Session expired. Sign in again.');
  } else await createSession(session);
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: expiresAt.getTime() - Date.now() });
  return accessToken;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password, companySlug } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !(await comparePassword(password, user.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (user.status !== 'ACTIVE') throw ApiError.forbidden('This account has been disabled.');

  const grants = await listActiveGrantsForUser(user.id);
  const ownCompanyId = grants[0]?.company_id ?? null;
  const ownCompany = ownCompanyId ? await findCompanyById(ownCompanyId) : null;

  if (!companySlug) {
    throw ApiError.forbidden('Sign in from your company\'s login page.', {
      companyLoginPath: ownCompany?.company_slug ? `/${ownCompany.company_slug}/login` : null,
    });
  }

  const company = await findCompanyBySlug(companySlug);
  if (!company || company.status !== 'ACTIVE') {
    throw ApiError.forbidden('This login page belongs to a different company — check the URL your admin gave you.');
  }
  const grant = grants.find((g) => g.company_id === company.id);
  if (!grant) {
    throw ApiError.forbidden('This login page belongs to a different company — check the URL your admin gave you.');
  }

  const signedIn = await touchUserLastLogin(user.id);
  const wellnessGrant = grants.find((entry) => entry.company_id === company.id && entry.application === 'zenx-dietitian');
  if (wellnessGrant) {
    try {
      const mainAdminUserId = await reconcileCompanyMainAdmin({ companyId: company.id });
      await syncWellnessMainAdmin({ zenxUserId: user.id, mainAdminUserId, zenxRole: wellnessGrant.role,
        companyId: company.id, companySlug: company.company_slug, companyStatus: company.status });
    } catch (err) {
      console.error('[customerLogin] wellness-app ownership sync failed', safeErrorMeta(err));
    }
  }
  const accessToken = await issueTokens(res, signedIn, company.id);
  // Keep wellness-app's hash in lockstep. SSO handoff used to create that row with a random
  // unusable password, so the same email/password that works here then failed on
  // wellness-app's own /login. Failures stay non-fatal — this login must still succeed.
  try {
    await updateWellnessPassword({
      zenxUserId: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      mustChangePassword: Boolean(user.must_change_password),
      companyId: company.id,
      companySlug: company.company_slug,
    });
  } catch (err) {
    console.error('[customerLogin] wellness-app password sync failed', safeErrorMeta(err));
  }
  res.json({ user: toClientShape(signedIn), accessToken, companyId: company.id });
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

  const companyId = payload.companyId || null;
  if (companyId) {
    const company = await findCompanyById(companyId);
    if (!company || company.status !== 'ACTIVE') throw ApiError.unauthorized('Account no longer available');
    const grants = await listActiveGrantsForUser(user.id);
    if (!grants.some((grant) => grant.company_id === companyId)) throw ApiError.unauthorized('Company access has been revoked');
  }

  const accessToken = await issueTokens(res, user, companyId, { sid: payload.sid, token });
  res.json({ accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeRequestSessions(req, { cookieName: REFRESH_COOKIE, verifyRefresh: verifyCustomerRefreshToken, verifyAccess: verifyCustomerAccessToken, kind: 'customer' });
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
  const passwordHash = await hashPassword(password);
  const updated = await updateUserPassword(req.customer.id, passwordHash, false);
  await revokeAccountSessions('customer', updated.id);
  try {
    const company = req.customerCompanyId ? await findCompanyById(req.customerCompanyId) : null;
    await updateWellnessPassword({
      zenxUserId: updated.id,
      email: updated.email,
      passwordHash,
      mustChangePassword: false,
      companyId: company?.id,
      companySlug: company?.company_slug,
    });
  } catch (err) {
    console.error('[setNewPassword] wellness-app password sync failed', safeErrorMeta(err));
  }
  const accessToken = await issueTokens(res, updated, req.customerCompanyId);
  res.json({ user: toClientShape(updated), accessToken });
});

// Powers the Launcher screen (pick among multiple ACTIVE application grants) — replaces the
// frontend joining application_access_public + applications_public + companies itself.
export const getPublicCompany = asyncHandler(async (req, res) => {
  const company = await findCompanyBySlug(req.params.slug);
  if (!company || company.status !== 'ACTIVE') {
    res.json(null);
    return;
  }
  res.json({
    name: company.company_name,
    slug: company.company_slug,
    logo_url: company.logo_url,
  });
});

export const getActiveGrants = asyncHandler(async (req, res) => {
  let grants = await listActiveGrantsForUser(req.customer.id);
  if (req.customerCompanyId) {
    grants = grants.filter((g) => g.company_id === req.customerCompanyId);
  }
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
      application: toPublicApplication(applications.find((a) => a.slug === grant.application)) ?? null,
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
// Ownership additionally carries an explicit issuer/audience and the persisted ZenX owner ID.
// Wellness requires that ID to equal sub and the role to remain wellness_admin before assigning
// a local owner; ordinary staff grants and unconfigured/ambiguous companies convey no elevation.
export const issueHandoffToken = asyncHandler(async (req, res) => {
  const { applicationSlug } = req.body;
  if (req.customer.status !== 'ACTIVE') throw ApiError.forbidden('This account has been disabled.');
  const companyId = req.customerCompanyId;
  if (!companyId) {
    throw ApiError.forbidden('Sign in from your company\'s login page.');
  }

  const company = await findCompanyById(companyId);
  if (!company || company.status !== 'ACTIVE') throw ApiError.forbidden("You don't have access to this company.");

  const grant = await findApplicationAccess(req.customer.id, companyId, applicationSlug);
  if (!grant || grant.status !== 'ACTIVE') throw ApiError.forbidden("You don't have access to this application.");

  const application = await findApplicationBySlug(applicationSlug);
  if (!application?.url || !application?.handoff_secret) {
    throw ApiError.conflict('This application is not deployed yet.');
  }

  const mainAdminUserId = applicationSlug === 'zenx-dietitian'
    ? await reconcileCompanyMainAdmin({ companyId: company.id }) : null;

  const token = jwt.sign(
    {
      sub: req.customer.id,
      email: req.customer.email,
      contact_name: `${req.customer.first_name} ${req.customer.last_name}`.trim(),
      role: grant.role,
      iss: 'zenx-admin',
      aud: applicationSlug,
      main_admin_user_id: mainAdminUserId,
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

  if (applicationSlug === 'zenx-dietitian') {
    try {
      await syncWellnessMainAdmin({ zenxUserId: req.customer.id, mainAdminUserId, zenxRole: grant.role,
        companyId: company.id, companySlug: company.company_slug, companyStatus: company.status });
    } catch (err) {
      console.error('[issueHandoffToken] wellness-app ownership sync failed', safeErrorMeta(err));
    }
    try {
      await updateWellnessPassword({
        zenxUserId: req.customer.id,
        email: req.customer.email,
        passwordHash: req.customer.password_hash,
        mustChangePassword: Boolean(req.customer.must_change_password),
        companyId: company.id,
        companySlug: company.company_slug,
      });
    } catch (err) {
      console.error('[issueHandoffToken] wellness-app password sync failed', safeErrorMeta(err));
    }
  }

  res.json({ url: `${application.url}/${company.company_slug}/handoff?token=${token}` });
});
