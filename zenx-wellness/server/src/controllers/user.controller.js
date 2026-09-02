import {
  listUsers as queryUsers,
  findUserById,
  updateUser as updateUserRecord,
  createUser as createUserRecord,
  findUserByEmail,
} from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.js';
import { toClientShape } from '../utils/serialize.js';
import { notifyClientAccountCreated } from '../services/accountNotifications.js';
import { upsertDeviceToken, deleteToken } from '../models/DeviceToken.js';

// A blank controlled-form field arrives as '' (see the optionalPhone/optionalAddress union in
// user.schema.js) — treated as "clear this field," not "set it to the literal empty string."
function nullifyEmpty(value) {
  return value === '' ? null : value;
}

// Shared by createUser/updateUser: throws a 409 if `email` already belongs to a *different* user
// than `excludeUserId`. A static schema can't see other rows, so this always needs a real query —
// the DB's own UNIQUE KEY on email is the last-resort backstop if a race slips past this check.
async function assertEmailAvailable(email, excludeUserId = null) {
  const existing = await findUserByEmail(email);
  if (existing && existing.id !== excludeUserId) throw ApiError.conflict('That email is already registered to another account');
}

export const listUsers = asyncHandler(async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.role) filter.role = req.query.role;
  if (req.user.role === 'dietitian') filter.assignedDietitian = req.user.id;
  else if (req.user.role === 'client') filter.role = 'dietitian'; // clients may only browse their own org's dietitian directory
  else if (req.query.assignedDietitian) filter.assignedDietitian = req.query.assignedDietitian;

  const users = await queryUsers(filter);
  res.json(users.map((u) => toClientShape(u, ['passwordHash'])));
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await findUserById(req.params.id);
  // Wrong-company is a 404, not 403 — same "don't reveal existence" reasoning as
  // enquiry.controller.js's assertOwnEnquiry.
  if (!user || user.companyId !== req.user.companyId) throw ApiError.notFound('User not found');

  const isSelf = user.id === req.user.id;
  const isOwningDietitian = req.user.role === 'dietitian' && String(user.assignedDietitian) === req.user.id;
  if (!isSelf && !isOwningDietitian && req.user.role !== 'admin') throw ApiError.forbidden();

  res.json(toClientShape(user, ['passwordHash']));
});

export const updateMe = asyncHandler(async (req, res) => {
  const { assignedDietitian } = req.body;
  if (assignedDietitian !== undefined) {
    if (req.user.role !== 'client') throw ApiError.forbidden('Only clients can choose a dietitian');
    if (assignedDietitian !== null) {
      const dietitian = await findUserById(assignedDietitian);
      if (!dietitian || dietitian.role !== 'dietitian' || dietitian.companyId !== req.user.companyId) {
        throw ApiError.badRequest('Invalid dietitian');
      }
    }
  }

  const user = await updateUserRecord(req.user.id, req.body);
  res.json(toClientShape(user, ['passwordHash']));
});

// Reachable by admin (full access) or a dietitian editing their own assigned client's contact
// info only (spec §2026-round2-fixes item 3: "Edit Client, both admin and dietitian portals") —
// route-level authorize() lets both roles in; ownership + field restriction are enforced here,
// mirroring call.controller.js#updateCall's isOwningClient allowlist pattern.
export const updateUser = asyncHandler(async (req, res) => {
  const target = await findUserById(req.params.id);
  if (!target || target.companyId !== req.user.companyId) throw ApiError.notFound('User not found');

  let patch = { ...req.body };

  if (req.user.role === 'dietitian') {
    const isOwnClient = target.role === 'client' && String(target.assignedDietitian) === req.user.id;
    if (!isOwnClient) throw ApiError.forbidden();
    // timezone/country/dateFormat/timeFormat added alongside email/phone (spec item 8: "allow the
    // dietitian/admin to view and update the client's timezone when appropriate") — a dietitian
    // booking a call with their own client needs to be able to set that client's zone, not just an
    // admin.
    const allowedKeys = new Set(['email', 'phone', 'timezone', 'country', 'dateFormat', 'timeFormat']);
    if (Object.keys(patch).some((key) => !allowedKeys.has(key))) {
      throw ApiError.forbidden('Dietitians may only edit a client’s email, phone, and timezone preferences');
    }
  }

  const { assignedDietitian, role, email, phone, address } = patch;
  if (assignedDietitian) {
    const dietitian = await findUserById(assignedDietitian);
    if (!dietitian || dietitian.role !== 'dietitian' || dietitian.companyId !== req.user.companyId) {
      throw ApiError.badRequest('Invalid dietitian');
    }
  }
  // Changing email keeps the account fully working: JWTs/sessions key off the immutable user id
  // (utils/jwt.js signs { sub: user.id }, never email), so no re-login or token invalidation is
  // needed — the very next login (and every already-issued token) just keeps working, now against
  // the new address. Only real-world risk is a duplicate, checked here (and backstopped by the
  // DB's own UNIQUE KEY on email).
  if (email !== undefined) await assertEmailAvailable(email, target.id);
  if (phone !== undefined) patch.phone = nullifyEmpty(phone);
  if (address !== undefined) patch.address = nullifyEmpty(address);

  // programPlan/planDuration only ever apply to a client — same conditional-apply convention as
  // assignedDietitian above. Only cleared when this patch explicitly changes the role away from
  // client; otherwise passed through as given (or omitted, leaving them untouched).
  if (role !== undefined && role !== 'client') {
    patch.programPlan = null;
    patch.planDuration = null;
  }

  const user = await updateUserRecord(req.params.id, patch);
  if (!user) throw ApiError.notFound('User not found');
  res.json(toClientShape(user, ['passwordHash']));
});

export const createUser = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    phone = null,
    address = null,
    qualifications = null,
    assignedDietitian = null,
    programPlan = null,
    planDuration = null,
    timezone,
  } = req.body;
  await assertEmailAvailable(email);

  if (assignedDietitian) {
    const dietitian = await findUserById(assignedDietitian);
    if (!dietitian || dietitian.role !== 'dietitian' || dietitian.companyId !== req.user.companyId) {
      throw ApiError.badRequest('Invalid dietitian');
    }
  }

  const user = await createUserRecord({
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
    phone: nullifyEmpty(phone),
    address: nullifyEmpty(address),
    qualifications: nullifyEmpty(qualifications),
    assignedDietitian: role === 'client' ? assignedDietitian : null,
    programPlan: role === 'client' ? programPlan : null,
    planDuration: role === 'client' ? planDuration : null,
    timezone,
    // Every account is admin-created now (self-registration is gone) — the person who set this
    // password is never the one who'll use it, so force a change on first login.
    mustChangePassword: true,
    // Always the creating org admin's own company — never client-supplied — so a sub-user can
    // only ever be created inside the org that created them (the "Wellness admins manage their
    // own users" requirement). This route is admin-only (see user.routes.js authorize()), so
    // req.user.companyId is always a real org admin's company, never a ZenX platform admin's.
    companyId: req.user.companyId,
    companySlug: req.user.companySlug,
  });

  // Only a client account created here gets the welcome email — a dietitian/admin account created
  // through this same endpoint doesn't (trigger is "Client account created", not "any account").
  if (role === 'client') await notifyClientAccountCreated(user, { plainPassword: password });

  res.status(201).json(toClientShape(user, ['passwordHash']));
});

export const registerDeviceToken = asyncHandler(async (req, res) => {
  const row = await upsertDeviceToken({
    userId: req.user.id,
    token: req.body.token,
    platform: req.body.platform ?? 'web',
  });
  res.status(201).json({ id: row?.id, platform: row?.platform });
});

export const unregisterDeviceToken = asyncHandler(async (req, res) => {
  await deleteToken(req.body.token);
  res.status(204).send();
});
