import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signStaffAccessToken, signStaffRefreshToken, verifyStaffRefreshToken, verifyStaffAccessToken } from '../utils/jwt.js';
import { findProfileByEmail, findProfileById, updateProfile } from '../models/Profile.js';
import { createPasswordResetToken, resetPasswordWithToken } from '../models/PasswordResetToken.js';
import { sendPasswordResetEmail } from '../emails/sendPasswordResetEmail.js';
import { randomUUID } from 'node:crypto';
import { createSession, rotateSession, revokeRequestSessions } from '../models/AuthSession.js';
import { toPublicAccount as toClientShape } from '../utils/publicAccount.js';

const REFRESH_COOKIE = 'zenxadmin_refresh';

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

async function issueTokens(res, profile, previous = null) {
  const sid = previous?.sid || randomUUID();
  const accessToken = signStaffAccessToken(profile, sid);
  const refreshToken = signStaffRefreshToken(profile, sid);
  const expiresAt = new Date(verifyStaffRefreshToken(refreshToken).exp * 1000);
  const session = { id: sid, kind: 'staff', accountId: profile.id, passwordHash: profile.password_hash, refreshToken, expiresAt };
  if (previous) {
    if (!(await rotateSession({ ...session, previousToken: previous.token }))) throw ApiError.unauthorized('Session expired. Sign in again.');
  } else await createSession(session);
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: expiresAt.getTime() - Date.now() });
  return accessToken;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const profile = await findProfileByEmail(email);
  if (!profile || !(await comparePassword(password, profile.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (profile.status !== 'ACTIVE') throw ApiError.forbidden('This account has been disabled.');

  const accessToken = await issueTokens(res, profile);
  res.json({ profile: toClientShape(profile), accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('Missing refresh token');

  let payload;
  try {
    payload = verifyStaffRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const profile = await findProfileById(payload.sub);
  if (!profile || profile.status !== 'ACTIVE') throw ApiError.unauthorized('Account no longer available');

  const accessToken = await issueTokens(res, profile, { sid: payload.sid, token });
  res.json({ accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeRequestSessions(req, { cookieName: REFRESH_COOKIE, verifyRefresh: verifyStaffRefreshToken, verifyAccess: verifyStaffAccessToken, kind: 'staff' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  res.json({ profile: toClientShape(req.staff) });
});

// Self-service preferences (spec item 8: "change from Profile Settings") — the admin-managed
// PATCH /admin-users/:id already existed for role/status; this is the same updateProfile model
// function, scoped by req.staff.id instead of a URL param, and restricted to the self-editable
// preference fields (updateMyProfileSchema) so a staff member can never grant themselves a role
// change through this route.
export const updateMe = asyncHandler(async (req, res) => {
  const profile = await updateProfile(req.staff.id, req.body);
  res.json(toClientShape(profile));
});

// One source of truth for the token's lifetime: the same value mints the token and is rendered
// into the email's "expires in ..." sentence, so the two can't drift apart.
const RESET_TTL_MINUTES = 60;

// Replaces Supabase's auth.resetPasswordForEmail — always responds 204 regardless of whether the
// email matched, so this endpoint can never be used to enumerate staff accounts.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const profile = await findProfileByEmail(email);
  if (profile) {
    const token = await createPasswordResetToken({ accountKind: 'staff', accountId: profile.id, ttlMinutes: RESET_TTL_MINUTES });
    // Not awaited into the response path unguarded: a mail-provider outage must not turn a valid
    // reset request into a 500 (the token is already minted and the link still works).
    await sendPasswordResetEmail({
      to: profile.email,
      name: profile.first_name,
      token,
      kind: 'staff',
      expiresInMinutes: RESET_TTL_MINUTES,
    }).catch(() => console.error('[forgotPassword] failed to send reset email'));
  }
  res.status(204).send();
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!(await resetPasswordWithToken('staff', token, await hashPassword(password)))) {
    throw ApiError.badRequest('This reset link is invalid or has expired.');
  }
  res.status(204).send();
});
