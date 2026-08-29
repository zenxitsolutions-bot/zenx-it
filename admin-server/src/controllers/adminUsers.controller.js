import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { createProfile, findProfileByEmail, listProfiles, updateProfile, updateProfilePassword } from '../models/Profile.js';
import { createPasswordResetToken, consumePasswordResetToken } from '../models/PasswordResetToken.js';
import { sendStaffInviteEmail } from '../emails/sendStaffInviteEmail.js';
import { hashPassword } from '../utils/password.js';

export const listAdminUsers = asyncHandler(async (req, res) => {
  res.json(await listProfiles());
});

// Replaces the invite-admin-user edge function's auth.admin.inviteUserByEmail call — there's no
// drop-in equivalent without Supabase Auth, so this is genuinely new: create the profile with an
// unusable placeholder password, then email a set-password link (same shape as wellness-app's own
// handoff-provisioned-account pattern: never share a real password, always force it to be set via
// a link).
export const inviteAdminUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, role } = req.body;
  if (await findProfileByEmail(email)) throw ApiError.conflict('A staff account with this email already exists');

  const placeholder = await hashPassword(crypto.randomUUID());
  const profile = await createProfile({ firstName, lastName, email, passwordHash: placeholder, role });

  const token = await createPasswordResetToken({ accountKind: 'staff', accountId: profile.id, ttlMinutes: 60 * 24 * 7 });
  await sendStaffInviteEmail({ to: email, name: firstName, token });

  res.status(201).json(profile);
});

export const patchAdminUser = asyncHandler(async (req, res) => {
  res.json(await updateProfile(req.params.id, req.body));
});

// The set-password half of the invite flow above — a fresh invitee has no session yet, so this is
// a public route gated by the one-time token instead of authenticateStaff.
export const setPasswordFromToken = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const record = await consumePasswordResetToken('staff', token);
  if (!record) throw ApiError.badRequest('This invite link is invalid or has expired.');
  await updateProfilePassword(record.account_id, await hashPassword(password));
  res.status(204).send();
});
