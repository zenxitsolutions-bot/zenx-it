import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

// Replaces the primitive Supabase Auth's inviteUserByEmail/resetPasswordForEmail provided for
// free — the raw token is emailed (never stored), only its hash lives in the DB, mirroring
// wellness-app's own password-reset-token convention.
const hashToken = (raw) => createHash('sha256').update(raw).digest('hex');

export async function createPasswordResetToken({ accountKind, accountId, ttlMinutes }) {
  const raw = randomBytes(32).toString('hex');
  const id = newId();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await pool.query(
    'INSERT INTO password_reset_tokens (id, account_kind, account_id, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
    [id, accountKind, accountId, hashToken(raw), expiresAt]
  );
  return raw;
}

export async function consumePasswordResetToken(accountKind, raw) {
  const tokenHash = hashToken(raw);
  const [rows] = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE account_kind = ? AND token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1',
    [accountKind, tokenHash]
  );
  const row = rows[0];
  if (!row) return null;
  const [result] = await pool.query(
    'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE id = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3)',
    [row.id]
  );
  return result.affectedRows === 1 ? row : null;
}

/**
 * Lock the account BEFORE any reset-token row. Two different valid links for the same account
 * then serialize without deadlocking while we retire the sibling links in the transaction.
 */
export async function resetPasswordWithToken(accountKind, raw, passwordHash) {
  if (!['staff', 'customer'].includes(accountKind)) throw new Error('Invalid account kind');
  const tokenHash = hashToken(raw);
  const [candidates] = await pool.query(
    'SELECT account_id FROM password_reset_tokens WHERE account_kind = ? AND token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3) LIMIT 1',
    [accountKind, tokenHash]
  );
  if (!candidates[0]) return null;
  const accountId = candidates[0].account_id;
  const table = accountKind === 'staff' ? 'profiles' : 'users';
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [accounts] = await conn.query(`SELECT id FROM ${table} WHERE id = ? FOR UPDATE`, [accountId]);
    const [tokens] = accounts.length ? await conn.query(
      'SELECT id FROM password_reset_tokens WHERE account_kind = ? AND account_id = ? AND token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3) FOR UPDATE',
      [accountKind, accountId, tokenHash]
    ) : [[]];
    if (!tokens.length) { await conn.rollback(); return null; }
    await conn.query(
      `UPDATE ${table} SET password_hash = ?${accountKind === 'customer' ? ', must_change_password = FALSE' : ''} WHERE id = ?`,
      [passwordHash, accountId]
    );
    await conn.query('UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE account_kind = ? AND account_id = ? AND used_at IS NULL', [accountKind, accountId]);
    await conn.query('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(3) WHERE account_kind = ? AND account_id = ? AND revoked_at IS NULL', [accountKind, accountId]);
    await conn.commit();
    return accountId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
