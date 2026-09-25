import { pool, withTransaction } from '../db/pool.js';
import { findUserById } from './User.js';
import { newId } from '../db/id.js';
import { getDefaultPermissions, getEffectivePermissions, hasPermission, isMainAdmin, PERMISSION_DEFINITIONS, PERMISSION_KEYS } from '../../../shared/permissions.js';
import { ApiError } from '../utils/ApiError.js';

function parseOverrides(value) {
  if (value === null || value === undefined) return null;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid permissions');
    // A malformed persisted setting must fail closed, not silently restore broad defaults.
    if (Object.entries(parsed).some(([key, enabled]) => !PERMISSION_KEYS.includes(key) || typeof enabled !== 'boolean')) throw new Error('Invalid permissions');
    return parsed;
  } catch {
    return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false]));
  }
}

export async function getCompanyAccessControl(companyId, conn = pool) {
  if (!companyId) return null;
  const [rows] = await conn.query('SELECT company_id, main_admin_user_id FROM company_access_control WHERE company_id = ? LIMIT 1', [companyId]);
  return rows[0] ?? null;
}

export async function hydrateUserPermissions(user, conn = pool, { forUpdate = false } = {}) {
  if (!user) return user;
  if (user.role === 'client') return { ...user, isMainAdmin: false, permissions: getDefaultPermissions('client'), permissionOverrides: null, permissionsConfigured: false };
  const [rows] = await conn.query(
    `SELECT ac.main_admin_user_id, up.permissions_json
       FROM users u
       LEFT JOIN company_access_control ac ON ac.company_id = u.company_id
       LEFT JOIN user_permissions up ON up.user_id = u.id AND up.company_id = u.company_id
       WHERE u.id = ? AND u.company_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`, [user.id, user.companyId]);
  const access = rows[0];
  const decorated = {
    ...user,
    isMainAdmin: user.role === 'admin' && Boolean(access?.main_admin_user_id) && access.main_admin_user_id === user.id,
    permissionOverrides: parseOverrides(access?.permissions_json),
    permissionsConfigured: Boolean(access?.main_admin_user_id),
  };
  return { ...decorated, permissions: getEffectivePermissions(decorated) };
}

export async function hydrateManyUserPermissions(users, conn = pool) {
  if (!users.length) return [];
  const [rows] = await conn.query(
    `SELECT u.id, ac.main_admin_user_id, up.permissions_json FROM users u
       LEFT JOIN company_access_control ac ON ac.company_id = u.company_id
       LEFT JOIN user_permissions up ON up.user_id = u.id AND up.company_id = u.company_id
       WHERE u.id IN (${users.map(() => '?').join(', ')})`, users.map((user) => user.id));
  const accessById = new Map(rows.map((row) => [row.id, row]));
  return users.map((user) => {
    const access = accessById.get(user.id);
    const decorated = { ...user, isMainAdmin: user.role === 'admin' && access?.main_admin_user_id === user.id,
      permissionOverrides: parseOverrides(access?.permissions_json), permissionsConfigured: Boolean(access?.main_admin_user_id) };
    return { ...decorated, permissions: getEffectivePermissions(decorated) };
  });
}

export function validatePermissionMap(role, permissions) {
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)
    || Object.keys(permissions).length !== PERMISSION_KEYS.length
    || PERMISSION_KEYS.some((key) => typeof permissions[key] !== 'boolean')
    || Object.keys(permissions).some((key) => !PERMISSION_KEYS.includes(key))) {
    throw ApiError.badRequest('Provide a boolean value for every supported permission');
  }
  for (const definition of PERMISSION_DEFINITIONS) {
    if (permissions[definition.key] && !definition.roles.includes(role)) throw ApiError.badRequest('This permission is not available for the selected role');
    if (permissions[definition.key] && definition.requires.some((key) => !permissions[key])) throw ApiError.badRequest(`Enable the required viewing permission before enabling ${definition.label}`);
  }
  return { ...permissions };
}

export function assertCanManagePermissions(actor, target, permissions) {
  if (!actor || actor.role !== 'admin' || !hasPermission(actor, 'permissions.manage')) throw ApiError.forbidden('Only an authorized admin can manage permissions');
  if (!actor.companyId || target.companyId !== actor.companyId) throw ApiError.notFound('User not found');
  if (!['admin', 'dietitian'].includes(target.role)) throw ApiError.badRequest('Permissions can be configured only for admins and dietitians');
  if (target.id === actor.id) throw ApiError.forbidden('You cannot change your own permissions');
  if (isMainAdmin(target)) throw ApiError.forbidden('The main admin always has full access');
  if (isMainAdmin(actor)) return;
  if (hasPermission(target, 'permissions.manage')) throw ApiError.forbidden('Only the main admin can change another permission manager');
  if (permissions['permissions.manage']) throw ApiError.forbidden('Only the main admin can appoint permission managers');
  const current = getEffectivePermissions(target);
  for (const key of PERMISSION_KEYS) {
    // A manager may leave an existing higher grant unchanged, but cannot expand it.
    if (permissions[key] && !current[key] && !hasPermission(actor, key)) throw ApiError.forbidden('You cannot grant a permission you do not have');
  }
}

export function assertCanManageAccount(actor, target) {
  if (!actor?.companyId || actor.companyId !== target?.companyId) throw ApiError.notFound('User not found');
  if (actor.id === target.id) throw ApiError.forbidden('Use My account to update your own profile');
  if (isMainAdmin(actor)) return;
  if (isMainAdmin(target) || hasPermission(target, 'permissions.manage')) throw ApiError.forbidden('Only the main admin can change this protected administrator');
  // Password/email/role changes are equivalent to taking control of this identity. Do not let
  // a restricted admin reset a more privileged peer and then sign in as them.
  if (target.role !== 'client' && PERMISSION_KEYS.some((key) => hasPermission(target, key) && !hasPermission(actor, key))) {
    throw ApiError.forbidden('You cannot manage an account with more access than your own');
  }
}

export async function assignInitialPermissions(actor, user, conn = pool) {
  if (user.role === 'client') return;
  const permissions = getDefaultPermissions(user.role);
  for (const key of PERMISSION_KEYS) {
    permissions[key] = permissions[key] && (isMainAdmin(actor) || hasPermission(actor, key));
  }
  permissions['permissions.manage'] = false;
  const effective = getEffectivePermissions({ role: user.role, permissionOverrides: permissions });
  await conn.query('INSERT INTO user_permissions (user_id, company_id, permissions_json, updated_by) VALUES (?, ?, ?, ?)',
    [user.id, user.companyId, JSON.stringify(effective), actor.id]);
}

// All staff account mutations use the same lock order as permission changes.
// The first lookup only discovers the company; every authorization decision is
// based on a current locking read AFTER that company's access-control lock.
// This callback may be retried after a deadlock: keep it DB-only and notify users
// or call external providers only after this function resolves/commits.
export async function withAccountAccessTransaction(actorId, targetId, callback) {
  return withTransaction(async (conn) => {
    const [actorRows] = await conn.query('SELECT id, company_id FROM users WHERE id = ? LIMIT 1', [actorId]);
    const companyId = actorRows[0]?.company_id;
    if (!companyId) throw ApiError.forbidden();
    // Missing configuration retains legacy role defaults; it never elects an
    // owner. The locked actor row below still serializes concurrent edits.
    await conn.query('SELECT main_admin_user_id FROM company_access_control WHERE company_id = ? FOR UPDATE', [companyId]);
    const ids = [...new Set([actorId, targetId].filter(Boolean))].sort();
    const [locked] = await conn.query(
      `SELECT id FROM users WHERE id IN (${ids.map(() => '?').join(', ')}) AND company_id = ? ORDER BY id FOR UPDATE`,
      [...ids, companyId]);
    if (!locked.some((user) => user.id === actorId)) throw ApiError.forbidden();
    if (targetId && !locked.some((user) => user.id === targetId)) throw ApiError.notFound('User not found');
    const actor = await hydrateUserPermissions(await findUserById(actorId, conn, { forUpdate: true }), conn, { forUpdate: true });
    const target = targetId
      ? await hydrateUserPermissions(await findUserById(targetId, conn, { forUpdate: true }), conn, { forUpdate: true })
      : null;
    if (!actor || actor.companyId !== companyId || actor.accountStatus !== 'active') throw ApiError.forbidden('This account is not active');
    if (targetId && (!target || target.companyId !== companyId)) throw ApiError.notFound('User not found');
    return callback({ actor, target, conn });
  });
}

export async function setUserPermissions(actorId, targetId, permissions) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // A company row serializes owner assignment and permission changes. Re-read both users and
    // their permissions inside the lock so a just-revoked manager cannot race a stale request.
    const [actorRows] = await conn.query('SELECT id, company_id FROM users WHERE id = ? LIMIT 1', [actorId]);
    const companyId = actorRows[0]?.company_id;
    if (!companyId) throw ApiError.forbidden();
    const [controlRows] = await conn.query('SELECT main_admin_user_id FROM company_access_control WHERE company_id = ? FOR UPDATE', [companyId]);
    if (!controlRows[0]) throw ApiError.conflict('The main admin must be configured before editing permissions');
    const [users] = await conn.query('SELECT id, role, company_id, account_status FROM users WHERE id IN (?, ?) AND company_id = ? ORDER BY id FOR UPDATE', [actorId, targetId, companyId]);
    const map = (row) => row && ({ id: row.id, role: row.role, companyId: row.company_id, accountStatus: row.account_status });
    const actor = await hydrateUserPermissions(map(users.find((row) => row.id === actorId)), conn, { forUpdate: true });
    const target = await hydrateUserPermissions(map(users.find((row) => row.id === targetId)), conn, { forUpdate: true });
    if (!actor || actor.accountStatus !== 'active') throw ApiError.forbidden('This account is not active');
    if (!target) throw ApiError.notFound('User not found');
    const normalized = validatePermissionMap(target.role, permissions);
    assertCanManagePermissions(actor, target, normalized);
    await conn.query(
      'INSERT INTO user_permissions (user_id, company_id, permissions_json, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE permissions_json = VALUES(permissions_json), updated_by = VALUES(updated_by), updated_at = UTC_TIMESTAMP(3)',
      [target.id, companyId, JSON.stringify(normalized), actor.id]);
    await conn.query('INSERT INTO permission_audit (id, company_id, actor_id, target_id, action, details_json) VALUES (?, ?, ?, ?, ?, ?)',
      [newId(), companyId, actor.id, target.id, 'permissions_updated', JSON.stringify({ before: target.permissions, after: normalized })]);
    await conn.query("UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(3) WHERE account_kind = 'wellness' AND account_id = ? AND revoked_at IS NULL", [target.id]);
    await conn.commit();
    return target.id;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

// Called only from a trusted operator CLI, never from an authenticated web request. No automatic
// 'first admin wins' rule: existing staff are not promoted simply by opening a new screen.
export async function initializeMainAdmin({ companyId, userId }, conn = pool) {
  const [rows] = await conn.query("SELECT id FROM users WHERE id = ? AND company_id = ? AND role = 'admin' AND account_status = 'active' LIMIT 1", [userId, companyId]);
  if (!rows[0]) throw ApiError.badRequest('Choose an active admin belonging to this company');
  const current = await getCompanyAccessControl(companyId, conn);
  if (current) {
    if (current.main_admin_user_id !== userId) throw ApiError.conflict('A main admin is already configured; this command cannot transfer ownership');
    return false;
  }
  await conn.query('INSERT INTO company_access_control (company_id, main_admin_user_id) VALUES (?, ?)', [companyId, userId]);
  await conn.query('INSERT INTO permission_audit (id, company_id, actor_id, target_id, action, details_json) VALUES (?, ?, NULL, ?, ?, ?)', [newId(), companyId, userId, 'main_admin_initialized', '{}']);
  return true;
}
