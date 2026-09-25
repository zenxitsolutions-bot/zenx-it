import { newId } from '../db/id.js';

// Call only with an already signature-verified ZenX handoff payload. A local
// admin role, email address or request-body flag never proves company ownership.
export function hasZenxOwnerProof(payload) {
  return payload?.iss === 'zenx-admin' && payload.aud === 'zenx-dietitian'
    && payload.role === 'wellness_admin' && typeof payload.sub === 'string' && payload.sub.length > 0
    && payload.main_admin_user_id === payload.sub
    && typeof payload.company_id === 'string' && payload.company_id.length > 0;
}

// The caller supplies its transaction so initialization and one-use SSO session
// redemption commit together. Preserve any existing designated owner.
export async function initializeZenxMainAdmin({ user, payload }, conn) {
  if (!hasZenxOwnerProof(payload) || user?.role !== 'admin' || user.accountStatus !== 'active'
    || user.companyId !== payload.company_id || user.zenxUserId !== payload.sub) return false;
  const [companies] = await conn.query('SELECT id, status FROM companies WHERE id = ? FOR UPDATE', [user.companyId]);
  if (companies[0]?.status !== 'ACTIVE') return false;
  const [controls] = await conn.query('SELECT main_admin_user_id FROM company_access_control WHERE company_id = ? FOR UPDATE', [user.companyId]);
  const [users] = await conn.query('SELECT id, company_id, zenx_user_id, role, account_status FROM users WHERE id = ? FOR UPDATE', [user.id]);
  const current = users[0];
  if (!current || current.company_id !== payload.company_id || current.zenx_user_id !== payload.sub
    || current.role !== 'admin' || current.account_status !== 'active') return false;
  if (controls[0]) return false;
  await conn.query('INSERT INTO company_access_control (company_id, main_admin_user_id) VALUES (?, ?)', [current.company_id, current.id]);
  await conn.query('INSERT INTO permission_audit (id, company_id, actor_id, target_id, action, details_json) VALUES (?, ?, NULL, ?, ?, ?)',
    [newId(), current.company_id, current.id, 'main_admin_initialized', JSON.stringify({ source: 'zenx_handoff', zenxUserId: payload.sub })]);
  return true;
}
