import {
  listUsers as queryUsers,
  findUserById,
  updateUser as updateUserRecord,
  createUser as createUserRecord,
  findUserByEmail,
  setPassword,
  bumpRefreshTokenVersion,
} from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.js';
import { toClientShape } from '../utils/serialize.js';
import { notifyClientAccountCreated, notifyClientReactivated } from '../services/accountNotifications.js';
import { upsertDeviceToken, deleteToken } from '../models/DeviceToken.js';
import { todayCalendarDate } from '../utils/calendarDate.js';
import { hasPermission, isMainAdmin } from '../../../shared/permissions.js';
import { hydrateUserPermissions, hydrateManyUserPermissions, assertCanManageAccount, assignInitialPermissions, withAccountAccessTransaction } from '../models/AccessControl.js';
import { assertPermission } from '../middleware/permissions.js';
import { revokeAccountSessions } from '../models/AuthSession.js';
import { findProgramPlanById } from '../models/ProgramPlan.js';

// A blank controlled-form field arrives as '' (see the optionalPhone/optionalAddress union in
// user.schema.js) — treated as "clear this field," not "set it to the literal empty string."
function nullifyEmpty(value) {
  return value === '' ? null : value;
}

// Shared by createUser/updateUser: throws a 409 if `email` already belongs to a *different* user
// than `excludeUserId`. A static schema can't see other rows, so this always needs a real query —
// the DB's own UNIQUE KEY on email is the last-resort backstop if a race slips past this check.
async function assertEmailAvailable(email, excludeUserId = null, conn) {
  const existing = await findUserByEmail(email, conn);
  if (existing && existing.id !== excludeUserId) throw ApiError.conflict('That email is already registered to another account');
}

async function assertProgramPlanAssignment(req, programPlanId, conn) {
  assertPermission(req, 'program_plans.view');
  if (!programPlanId) return;
  const plan = await findProgramPlanById(programPlanId, conn);
  if (!plan || plan.companyId !== req.user.companyId) throw ApiError.badRequest('Invalid program package');
}

export const listUsers = asyncHandler(async (req, res) => {
  const filter = { companyId: req.user.companyId };
  const staffViewer = req.user.role !== 'client';
  if (staffViewer) {
    if (req.query.role === 'client') assertPermission(req, 'clients.view');
    else if (req.user.role === 'admin' && req.query.role) assertPermission(req, 'staff.view');
    else if (req.user.role === 'admin' && !hasPermission(req.user, 'staff.view') && !hasPermission(req.user, 'clients.view')) throw ApiError.forbidden();
    else if (req.user.role === 'dietitian') assertPermission(req, 'clients.view');
  }
  if (req.query.role) filter.role = req.query.role;
  if (req.user.role === 'dietitian' && req.query.role !== 'admin') filter.assignedDietitian = req.user.id;
  else if (req.user.role === 'client') filter.role = 'dietitian'; // clients may only browse their own org's dietitian directory
  else if (req.query.assignedDietitian) filter.assignedDietitian = req.query.assignedDietitian;

  let users = await queryUsers(filter);
  if (req.user.role === 'admin') users = users.filter((user) => hasPermission(req.user, user.role === 'client' ? 'clients.view' : 'staff.view'));
  if (req.user.role === 'dietitian') users = users.filter((user) => user.role === 'client' || (user.role === 'admin' && hasPermission(req.user, 'messages.use')));
  const decorated = staffViewer ? await hydrateManyUserPermissions(users) : users;
  res.json(decorated.map((u) => toClientShape(u, ['passwordHash', 'refreshTokenVersion'])));
});

// Assignment/booking selectors need names, not permission maps, credentials or contact records.
export const listDietitianOptions = asyncHandler(async (req, res) => {
  const selectorPermissions = ['staff.view', 'clients.create', 'clients.edit', 'diet_plans.view', 'calls.view', 'messages.use'];
  if (req.user.role !== 'client' && !selectorPermissions.some((key) => hasPermission(req.user, key))) throw ApiError.forbidden();
  let users = await queryUsers({ companyId: req.user.companyId, role: 'dietitian' });
  if (req.user.role === 'dietitian') users = users.filter((user) => user.id === req.user.id);
  res.json(users.map(({ id, name, role, timezone, accountStatus }) => ({ _id: id, name, role, timezone, accountStatus })));
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await findUserById(req.params.id);
  // Wrong-company is a 404, not 403 — same "don't reveal existence" reasoning as
  // enquiry.controller.js's assertOwnEnquiry.
  if (!user || user.companyId !== req.user.companyId) throw ApiError.notFound('User not found');

  const isSelf = user.id === req.user.id;
  const isOwningDietitian = req.user.role === 'dietitian' && String(user.assignedDietitian) === req.user.id;
  if (!isSelf && !isOwningDietitian && req.user.role !== 'admin') throw ApiError.forbidden();
  if (!isSelf) assertPermission(req, user.role === 'client' ? 'clients.view' : 'staff.view');

  res.json(toClientShape(await hydrateUserPermissions(user), ['passwordHash', 'refreshTokenVersion']));
});

export const updateMe = asyncHandler(async (req, res) => {
  const patch = { ...req.body };
  const { assignedDietitian } = patch;
  if (assignedDietitian !== undefined) {
    if (req.user.role !== 'client') throw ApiError.forbidden('Only clients can choose a dietitian');
    if (assignedDietitian !== null) {
      const dietitian = await findUserById(assignedDietitian);
      if (!dietitian || dietitian.role !== 'dietitian' || dietitian.companyId !== req.user.companyId) {
        throw ApiError.badRequest('Invalid dietitian');
      }
    }
  }

  if (req.user.role !== 'client') {
    delete patch.dietPreference;
    delete patch.allergies;
  }
  if (patch.phone !== undefined) patch.phone = nullifyEmpty(patch.phone);
  if (patch.allergies !== undefined) patch.allergies = nullifyEmpty(patch.allergies);

  const user = await updateUserRecord(req.user.id, patch);
  res.json(toClientShape(await hydrateUserPermissions(user), ['passwordHash', 'refreshTokenVersion']));
});

// Reachable by admin (full access) or a dietitian editing their own assigned client's contact
// info only (spec §2026-round2-fixes item 3: "Edit Client, both admin and dietitian portals") —
// route-level authorize() lets both roles in; ownership + field restriction are enforced here,
// mirroring call.controller.js#updateCall's isOwningClient allowlist pattern.
export const updateUser = asyncHandler(async (req, res) => {
  const { user, reactivated } = await withAccountAccessTransaction(req.user.id, req.params.id, async ({ actor, target, conn }) => {
    req.user = actor;
    if (!['admin', 'dietitian'].includes(actor.role)) throw ApiError.forbidden();
    assertPermission(req, target.role === 'client' ? 'clients.edit' : 'staff.edit');
    assertCanManageAccount(req.user, target);

    let patch = { ...req.body };
    if (patch.programPlan !== undefined || patch.planDuration !== undefined) await assertProgramPlanAssignment(req, patch.programPlan, conn);
    if (patch.role !== undefined && patch.role !== target.role && !isMainAdmin(req.user)) throw ApiError.forbidden('Only the main admin can change account roles');
    if (isMainAdmin(target) && (patch.role !== undefined || patch.accountStatus !== undefined)) throw ApiError.forbidden('The main admin account cannot be demoted or disabled');
    if (patch.email !== undefined) assertPermission(req, 'contact.view_email');
    if (patch.phone !== undefined) assertPermission(req, 'contact.view_phone');

    if (req.user.role === 'dietitian') {
      const isOwnClient = target.role === 'client' && String(target.assignedDietitian) === req.user.id;
      if (!isOwnClient) throw ApiError.forbidden();
      // timezone/country/dateFormat/timeFormat added alongside email/phone (spec item 8: "allow the
      // dietitian/admin to view and update the client's timezone when appropriate") — a dietitian
      // booking a call with their own client needs to be able to set that client's zone, not just an
      // admin.
      const allowedKeys = new Set(['email', 'phone', 'timezone', 'country', 'dateFormat', 'timeFormat', 'dietPreference', 'allergies']);
      if (Object.keys(patch).some((key) => !allowedKeys.has(key))) {
        throw ApiError.forbidden('Dietitians may only edit a client’s contact details and diet notes');
      }
    }

    const wasInactiveClient = target.role === 'client' && target.accountStatus === 'inactive';
    const { assignedDietitian, role, email, phone, address } = patch;
    if (assignedDietitian) {
      const dietitian = await findUserById(assignedDietitian, conn);
      if (!dietitian || dietitian.role !== 'dietitian' || dietitian.companyId !== req.user.companyId) {
        throw ApiError.badRequest('Invalid dietitian');
      }
    }
    // Changing email keeps the account fully working: JWTs/sessions key off the immutable user id
    // (utils/jwt.js signs { sub: user.id }, never email), so no re-login or token invalidation is
    // needed — the very next login (and every already-issued token) just keeps working, now against
    // the new address. Only real-world risk is a duplicate, checked here (and backstopped by the
    // DB's own UNIQUE KEY on email).
    if (email !== undefined) await assertEmailAvailable(email, target.id, conn);
    if (phone !== undefined) patch.phone = nullifyEmpty(phone);
    if (address !== undefined) patch.address = nullifyEmpty(address);

    // Deactivating or suspending a dietitian is only about that dietitian's own login. Assigned
    // clients keep their account_status and assignment — they must stay able to sign in.
    if (target.role === 'dietitian') {
      delete patch.assignedDietitian;
    }

    // programPlan/planDuration only ever apply to a client — same conditional-apply convention as
    // assignedDietitian above. Only cleared when this patch explicitly changes the role away from
    // client; otherwise passed through as given (or omitted, leaving them untouched).
    if (role !== undefined && role !== 'client') {
      patch.programPlan = null;
      patch.planDuration = null;
      patch.planStartedOn = null;
      patch.dietPreference = null;
      patch.allergies = null;
    } else if ((target.role === 'client' || patch.role === 'client') && req.user.role === 'admin') {
      const currentPlanId = target.programPlan?._id ?? target.programPlan ?? null;
      const nextPlan = patch.programPlan !== undefined ? patch.programPlan : currentPlanId;
      const nextDuration = patch.planDuration !== undefined ? patch.planDuration : target.planDuration;
      const planChanged =
        (patch.programPlan !== undefined && String(patch.programPlan ?? '') !== String(currentPlanId ?? '')) ||
        (patch.planDuration !== undefined && (patch.planDuration ?? null) !== (target.planDuration ?? null));
      if (planChanged && (nextPlan || nextDuration)) {
        patch.accountStatus = 'active';
        patch.planStartedOn = todayCalendarDate();
      } else if (patch.accountStatus === 'active' && wasInactiveClient && (nextPlan || nextDuration)) {
        patch.planStartedOn = todayCalendarDate();
      }
    }

    const user = await updateUserRecord(req.params.id, patch, conn);
    if (!user) throw ApiError.notFound('User not found');
    if (patch.role !== undefined && patch.role !== target.role) await revokeAccountSessions('wellness', target.id, conn);
    return { user, reactivated: wasInactiveClient && user.accountStatus === 'active' };
  });
  if (reactivated) await notifyClientReactivated(user);
  res.json(toClientShape(await hydrateUserPermissions(user), ['passwordHash', 'refreshTokenVersion']));
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
    joinedOn = null,
    assignedDietitian: requestedDietitian = null,
    programPlan = null,
    planDuration = null,
    dietPreference = null,
    allergies = null,
    timezone,
  } = req.body;
  const capability = { client: 'clients.create', dietitian: 'staff.create_dietitian', admin: 'staff.create_admin' }[role];
  if (!capability || (req.user.role === 'dietitian' && role !== 'client')) throw ApiError.forbidden();
  assertPermission(req, capability);
  const passwordHash = await hashPassword(password);
  const user = await withAccountAccessTransaction(req.user.id, null, async ({ actor, conn }) => {
    req.user = actor;
    if (!['admin', 'dietitian'].includes(actor.role) || (actor.role === 'dietitian' && role !== 'client')) throw ApiError.forbidden();
    assertPermission(req, capability);
    if (req.user.role === 'dietitian' && requestedDietitian && requestedDietitian !== req.user.id) throw ApiError.forbidden('New clients must be assigned to you');
    const assignedDietitian = req.user.role === 'dietitian' ? req.user.id : requestedDietitian;
    if (role === 'client' && (programPlan || planDuration)) await assertProgramPlanAssignment(req, programPlan, conn);
    await assertEmailAvailable(email, null, conn);

    if (assignedDietitian) {
      const dietitian = await findUserById(assignedDietitian, conn);
      if (!dietitian || dietitian.role !== 'dietitian' || dietitian.companyId !== req.user.companyId) {
        throw ApiError.badRequest('Invalid dietitian');
      }
    }

    const created = await createUserRecord({
      name,
      email,
      passwordHash,
      role,
      phone: nullifyEmpty(phone),
      address: nullifyEmpty(address),
      qualifications: nullifyEmpty(qualifications),
      joinedOn: role === 'dietitian' ? joinedOn : null,
      assignedDietitian: role === 'client' ? assignedDietitian : null,
      programPlan: role === 'client' ? programPlan : null,
      planDuration: role === 'client' ? planDuration : null,
      planStartedOn: role === 'client' && (programPlan || planDuration) ? todayCalendarDate() : null,
      dietPreference: role === 'client' ? dietPreference : null,
      allergies: role === 'client' ? allergies : null,
      timezone,
      // Staff-created accounts require the recipient to replace this temporary password.
      mustChangePassword: true,
      // Always the freshly authorized staff member's company, never client-supplied.
      companyId: req.user.companyId,
      companySlug: req.user.companySlug,
    }, conn);
    await assignInitialPermissions(req.user, created, conn);
    return created;
  });

  // Only a client account created here gets the welcome email — a dietitian/admin account created
  // through this same endpoint doesn't (trigger is "Client account created", not "any account").
  if (role === 'client') await notifyClientAccountCreated(user);

  res.status(201).json(toClientShape(await hydrateUserPermissions(user), ['passwordHash', 'refreshTokenVersion']));
});

// Permission-controlled reset sets a temporary password and forces /change-password next login.
// Existing refresh tokens are invalidated so a still-open session cannot keep using the app.
export const resetUserPassword = asyncHandler(async (req, res) => {
  assertPermission(req, 'users.reset_password');
  const passwordHash = await hashPassword(req.body.password);
  await withAccountAccessTransaction(req.user.id, req.params.id, async ({ actor, target, conn }) => {
    req.user = actor;
    if (!['admin', 'dietitian'].includes(actor.role)) throw ApiError.forbidden();
    assertPermission(req, 'users.reset_password');
    if (target.id === req.user.id) {
      throw ApiError.badRequest('Use Change password for your own account.');
    }
    assertCanManageAccount(req.user, target);
    if (req.user.role === 'dietitian' && (target.role !== 'client' || String(target.assignedDietitian) !== req.user.id)) throw ApiError.forbidden();

    await setPassword(target.id, {
      passwordHash,
      mustChangePassword: true,
    }, conn);
    await bumpRefreshTokenVersion(target.id, conn);
    await revokeAccountSessions('wellness', target.id, conn);
  });
  res.json({ ok: true });
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
