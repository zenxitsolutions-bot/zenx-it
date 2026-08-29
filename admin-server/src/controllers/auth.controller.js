import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signStaffAccessToken, signStaffRefreshToken, verifyStaffRefreshToken } from '../utils/jwt.js';
import { findProfileByEmail, findProfileById, updateProfile, updateProfilePassword } from '../models/Profile.js';
import { createPasswordResetToken, consumePasswordResetToken } from '../models/PasswordResetToken.js';
import { sendPasswordResetEmail } from '../emails/sendPasswordResetEmail.js';

const REFRESH_COOKIE = 'zenxadmin_refresh';

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function issueTokens(res, profile) {
  const accessToken = signStaffAccessToken(profile);
  const refreshToken = signStaffRefreshToken(profile);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  return accessToken;
}

function toClientShape(profile) {
  const { password_hash, ...rest } = profile;
  return rest;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const profile = await findProfileByEmail(email);
  if (!profile || !(await comparePassword(password, profile.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (profile.status !== 'ACTIVE') throw ApiError.forbidden('This account has been disabled.');

  const accessToken = issueTokens(res, profile);
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

  const accessToken = signStaffAccessToken(profile);
  res.json({ accessToken });
});

export const logout = asyncHandler(async (req, res) => {
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

// Replaces Supabase's auth.resetPasswordForEmail — always responds 204 regardless of whether the
// email matched, so this endpoint can never be used to enumerate staff accounts.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const profile = await findProfileByEmail(email);
  if (profile) {
    const token = await createPasswordResetToken({ accountKind: 'staff', accountId: profile.id, ttlMinutes: 60 });
    await sendPasswordResetEmail({ to: profile.email, name: profile.first_name, token, kind: 'staff' });
  }
  res.status(204).send();
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const record = await consumePasswordResetToken('staff', token);
  if (!record) throw ApiError.badRequest('This reset link is invalid or has expired.');

  await updateProfilePassword(record.account_id, await hashPassword(password));
  res.status(204).send();
});
