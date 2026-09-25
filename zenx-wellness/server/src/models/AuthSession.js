import { createHash } from 'node:crypto';
import { pool } from '../db/pool.js';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const scope = ({ id, kind, accountId, companyId = null }) => [id, kind, accountId, companyId];

// Store only one-way hashes. The credential fingerprint invalidates every old session whenever
// ANY password-writing path changes the account hash, including admin resets / cross-app sync.
export async function createSession({ id, kind, accountId, companyId = null, refreshToken, expiresAt, passwordHash }) {
  if (!id || !passwordHash) throw new Error('A session requires an id and account credentials');
  await pool.query(
    'INSERT INTO auth_sessions (id, account_kind, account_id, company_id, refresh_token_hash, credential_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, kind, accountId, companyId, digest(refreshToken), digest(passwordHash), expiresAt]
  );
}

export async function isSessionActive(input) {
  if (!input.id || !input.passwordHash) return false;
  const [rows] = await pool.query(
    `SELECT id FROM auth_sessions WHERE id = ? AND account_kind = ? AND account_id = ?
       AND company_id <=> ? AND credential_hash = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(3) LIMIT 1`,
    [...scope(input), digest(input.passwordHash)]
  );
  return rows.length === 1;
}

export async function rotateSession(input) {
  if (!input.id || !input.passwordHash) return false;
  // Compare-and-swap: two requests using the same token cannot both rotate successfully.
  const [result] = await pool.query(
    `UPDATE auth_sessions SET refresh_token_hash = ?, expires_at = ?, rotated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND account_kind = ? AND account_id = ? AND company_id <=> ?
       AND credential_hash = ? AND refresh_token_hash = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(3)`,
    [digest(input.refreshToken), input.expiresAt, ...scope(input), digest(input.passwordHash), digest(input.previousToken)]
  );
  if (result.affectedRows === 1) return true;
  // A validly signed but already-used token is a possible theft/replay. Revoke its session
  // (not the whole account); other devices keep working. Clients should serialize refresh.
  await revokeSession(input);
  return false;
}

export async function revokeSession(input) {
  if (!input.id) return;
  await pool.query(
    'UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(3) WHERE id = ? AND account_kind = ? AND account_id = ? AND revoked_at IS NULL',
    [input.id, input.kind, input.accountId]
  );
}

export async function revokeAccountSessions(kind, accountId, conn = pool) {
  await conn.query(
    'UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(3) WHERE account_kind = ? AND account_id = ? AND revoked_at IS NULL',
    [kind, accountId]
  );
}

// Logout must still work after access expiry. Accept either credential, but never trust a
// client-supplied session/account id, and never make a missing/invalid cookie prevent clearing it.
export async function revokeRequestSessions(req, { cookieName, verifyRefresh, verifyAccess, kind }) {
  const credentials = [[req.cookies?.[cookieName], verifyRefresh]];
  if (req.headers?.authorization?.startsWith('Bearer ')) credentials.push([req.headers.authorization.slice(7), verifyAccess]);
  const revoked = new Set();
  for (const [token, verify] of credentials) {
    let payload;
    try { if (token) payload = verify(token); } catch { continue; }
    if (!payload || revoked.has(payload.sid)) continue;
    await revokeSession({ id: payload.sid, kind, accountId: payload.sub });
    revoked.add(payload.sid);
  }
}
