import jwt from 'jsonwebtoken';
import {
  findUserByEmail,
  findUserById,
  findUserByZenxId,
  createUser,
  linkZenxUser,
  setPassword,
  bumpRefreshTokenVersion,
  setCompanySlug,
} from '../models/User.js';
import { upsertCompanyFromHandoff, findCompanyBySlug, findCompanyById } from '../models/Company.js';
import {
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  hashResetToken,
} from '../models/PasswordResetToken.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { toClientShape } from '../utils/serialize.js';
import { env } from '../config/env.js';
import crypto from 'node:crypto';

const REFRESH_COOKIE = 'nourishly_refresh';
const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  // In production the client (Vercel) and server (Render/Railway) are genuinely different
  // sites, not just different ports like local dev — `strict` (or even `lax`) would silently
  // stop the browser from ever sending this cookie cross-site, breaking refresh/logout entirely.
  // `none` requires `secure: true`, which is already true exactly when this is `none`.
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// One wording for every tenant-mismatch outcome (unknown slug, wrong company, user with no
// company) so the response cannot be used to tell those cases apart.
const TENANT_MISMATCH_MESSAGE = 'This login page belongs to a different company — check the URL your admin gave you.';

function issueTokens(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  return accessToken;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password, companySlug } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    console.warn('[login] rejected', { email, found: Boolean(user) });
    throw ApiError.unauthorized('Invalid email or password');
  }

  // ---- Tenant check -------------------------------------------------------------------------
  // A slug-scoped login URL (/:companySlug/login) may only ever sign in that company's own users.
  // The slug is resolved to a company_id *here*, from the database — the browser sends the slug it
  // was on, never a company id, so nothing the client controls can widen access. The comparison is
  // id-to-id: the URL's resolved company_id against the authenticated user's own stored
  // company_id, never against the slug string the client sent or any value from the request body.
  //
  // Runs after the password check on purpose. Everything below can only be reached by someone who
  // has already proved they own the account, so a distinct error here reveals nothing to an
  // attacker probing for valid emails or live company slugs — and it is why naming the caller's
  // own company URL below is safe.
  // Resolve the tenant. A slug-scoped URL (/:companySlug/login) must match this user's company.
  // The bare /login is allowed after a successful password check — welcome emails and the
  // marketing site have always pointed here, and refusing it left users staring at a form that
  // appeared to do nothing useful. Tenant isolation still holds when a slug IS present.
  let company = null;
  if (companySlug) {
    company = await findCompanyBySlug(companySlug);
    // Unknown slug is 403, not 404: this is reachable only with valid credentials, and a
    // distinguishable 404 would turn the login form into a slug-enumeration oracle.
    if (!company) throw ApiError.forbidden(TENANT_MISMATCH_MESSAGE);
    if (company.id !== user.companyId) throw ApiError.forbidden(TENANT_MISMATCH_MESSAGE);
  } else {
    company = user.companyId ? await findCompanyById(user.companyId) : null;
  }

  if (!company) {
    throw ApiError.forbidden("This account is not linked to a company. Contact your administrator.");
  }
  if (company.status !== 'ACTIVE') {
    throw ApiError.forbidden('This company account is not active. Contact your administrator.');
  }
  // Suspended always blocks. Inactive blocks clients (a converted-then-lost / deactivated
  // customer) but not dietitians — see the account_status comment in schema.sql.
  if (user.accountStatus === 'suspended') {
    throw ApiError.forbidden('This account has been suspended. Contact an administrator.');
  }
  if (user.role === 'client' && user.accountStatus === 'inactive') {
    throw ApiError.forbidden('This account is no longer active. Contact your administrator.');
  }

  // Conversion used to omit company_slug, which then sent the client to /undefined/app/... after
  // a successful login. Stamp it from the resolved company so existing rows start working.
  if (!user.companySlug && company.slug) {
    user = await setCompanySlug(user.id, company.slug);
  }

  const accessToken = issueTokens(res, user);
  res.json({ user: toClientShape(user, ['passwordHash']), accessToken });
});

// Verifies the short-lived SSO token admin-server's issueHandoffToken signs (see the claim-shape
// comment on that function — sub/email/contact_name/role/company_id/company_slug/company_name/
// logo_url/jti — this reads exactly those, byte-for-byte). Public endpoint: the token itself, not
// a session, proves the caller came from a real ZenX login.
export const handoff = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!env.zenxHandoffSecret) throw new Error('ZENX_HANDOFF_SECRET is not configured');

  let payload;
  try {
    payload = jwt.verify(token, env.zenxHandoffSecret);
  } catch {
    throw ApiError.unauthorized('This login link is invalid or has expired.');
  }

  // users.company_id has a FK into this app's own companies table — mirror the ZenX company here
  // first so a brand-new (never-before-seen) company can SSO in without a pre-seeded local row.
  // Use whatever id the mirror resolved to, not the token's — a company recreated in ZenX under an
  // existing slug keeps this app's original id (see upsertCompanyFromHandoff), and pointing the new
  // user at the token's id instead would fail fk_users_company.
  const localCompanyId = await upsertCompanyFromHandoff({
    id: payload.company_id,
    name: payload.company_name,
    slug: payload.company_slug,
    website: payload.website,
    logoUrl: payload.logo_url,
  });

  let user = await findUserByZenxId(payload.sub);
  if (!user) {
    user = await findUserByEmail(payload.email);
    if (user) {
      // A pre-existing account (e.g. a legacy-company user created before this identity ever SSO'd
      // in) gets linked to its ZenX identity — company_id is deliberately NOT overwritten here: it
      // already has one (every user row does, post-multi-tenancy), and a ZenX-side company change
      // must not silently move an existing local account into a different org.
      user = await linkZenxUser(user.id, payload.sub);
    } else {
      // First time this ZenX identity has reached wellness-app. ZenX's per-application `role`
      // claim (provisioning.controller.js#defaultRoleFor) maps to this app's local role enum:
      // 'wellness_admin' becomes this org's Wellness `admin` (can create/manage their own
      // dietitians/clients — see user.controller.js#createUser's companyId stamping); anything
      // else falls back to 'dietitian', the prior hardcoded behavior, for forward-compat with any
      // other per-application role ZenX might introduce later. Never 'client' — clients are
      // created inside this app by a dietitian/admin, not via SSO.
      user = await createUser({
        name: payload.contact_name || payload.email,
        email: payload.email,
        passwordHash: await hashPassword(crypto.randomBytes(32).toString('hex')),
        role: payload.role === 'wellness_admin' ? 'admin' : 'dietitian',
        zenxUserId: payload.sub,
        companyId: localCompanyId,
        companySlug: payload.company_slug ?? null,
      });
    }
  }

  if (user.accountStatus === 'suspended') {
    throw ApiError.forbidden('This account has been suspended. Contact an administrator.');
  }
  if (user.role === 'client' && user.accountStatus === 'inactive') {
    throw ApiError.forbidden('This account is no longer active. Contact your administrator.');
  }

  const mirrored = await findCompanyById(localCompanyId);
  if (mirrored?.status && mirrored.status !== 'ACTIVE') {
    throw ApiError.forbidden('This company account is not active. Contact your administrator.');
  }

  const accessToken = issueTokens(res, user);
  res.json({ user: toClientShape(user, ['passwordHash']), accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('Missing refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await findUserById(payload.sub);
  if (!user || user.refreshTokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized('Refresh token no longer valid');
  }

  res.json({ accessToken: signAccessToken(user) });
});

// Deliberately not gated by blockIfMustChangePassword (see auth.routes.js) — this is the one
// authenticated call a user with the flag still set must be able to make. Works whether
// `currentPassword` is the admin-set temp password or an ordinary one, since both are just
// `users.password_hash`. Reissues tokens (like login) so the caller lands in the dashboard
// without a separate re-login step, per spec.
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!(await comparePassword(currentPassword, req.user.passwordHash))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  const user = await setPassword(req.user.id, {
    passwordHash: await hashPassword(newPassword),
    mustChangePassword: false,
  });
  const accessToken = issueTokens(res, user);
  res.json({ user: toClientShape(user, ['passwordHash']), accessToken });
});

// Always responds the same way regardless of whether the email is registered or the send
// succeeded — a different response for "unknown email" or "send failed" would let a caller probe
// which emails have accounts. Failures are still logged server-side for operators to see.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await findUserByEmail(email);

  if (user && !(user.role === 'client' && user.accountStatus === 'inactive') && user.accountStatus !== 'suspended') {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + env.passwordResetTokenTtlMinutes * 60 * 1000);
    await createPasswordResetToken({ userId: user.id, tokenHash: hashResetToken(rawToken), expiresAt });

    // Slug-scoped so the link lands on the user's own company page — branded like their login
    // page, and, more importantly, so ResetPasswordPage can send them to /{slug}/login afterwards.
    // The bare /login refuses everyone (see the tenant check above), so a slugless reset link would
    // end on a page that cannot sign the user in. Falls back to the bare path only for a user with
    // no company_slug, which the bare /reset-password route still serves.
    const resetPath = user.companySlug ? `/${user.companySlug}/reset-password` : '/reset-password';
    const resetUrl = `${env.clientOrigin}${resetPath}?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
      console.error('[forgotPassword] failed to send reset email', err);
    });
  }

  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

// Deliberately does not touch mustChangePassword: a voluntary password reset by someone who
// already knew (or has now regained access to) their account is a different situation from the
// forced first-login change (auth.controller.js#changePassword) — that gate, if still set, stays
// in effect and is enforced the normal way on the caller's next request.
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const resetToken = await findValidPasswordResetToken(hashResetToken(token));
  if (!resetToken) throw ApiError.badRequest('This reset link is invalid or has expired.');

  const user = await findUserById(resetToken.userId);
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired.');

  await setPassword(user.id, { passwordHash: await hashPassword(password), mustChangePassword: user.mustChangePassword });
  await markPasswordResetTokenUsed(resetToken.id);
  // A leaked/forgotten password means any existing session could be compromised too.
  await bumpRefreshTokenVersion(user.id);

  res.status(204).send();
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: toClientShape(req.user, ['passwordHash']) });
});
