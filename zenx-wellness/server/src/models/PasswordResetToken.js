import crypto from 'node:crypto';
import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

// The emailed token is only ever stored/looked-up by its hash — same principle as password_hash.
export const hashResetToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

function mapToken(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

export async function createPasswordResetToken({ userId, tokenHash, expiresAt }) {
  const id = newId();
  await pool.query(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
    [id, userId, tokenHash, expiresAt]
  );
  return mapToken({ id, user_id: userId, token_hash: tokenHash, expires_at: expiresAt, used_at: null });
}

// Only returns a token that hasn't been used and hasn't expired — callers never need to check
// those conditions themselves.
export async function findValidPasswordResetToken(tokenHash) {
  const [rows] = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW(3) LIMIT 1',
    [tokenHash]
  );
  return mapToken(rows[0]);
}

export async function markPasswordResetTokenUsed(id) {
  await pool.query('UPDATE password_reset_tokens SET used_at = NOW(3) WHERE id = ?', [id]);
}

export async function consumePasswordResetToken(tokenHash) {
  const token = await findValidPasswordResetToken(tokenHash);
  if (!token) return null;
  const [result] = await pool.query(
    'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE id = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3)',
    [token.id]
  );
  return result.affectedRows === 1 ? token : null;
}

/** Account-first locking serializes distinct reset links and retires every sibling link/session. */
export async function resetPasswordWithToken(tokenHash, passwordHash) {
  const [candidates] = await pool.query(
    'SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3) LIMIT 1',
    [tokenHash]
  );
  if (!candidates[0]) return null;
  const userId = candidates[0].user_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [users] = await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
    const [tokens] = users.length ? await conn.query(
      'SELECT id FROM password_reset_tokens WHERE user_id = ? AND token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP(3) FOR UPDATE',
      [userId, tokenHash]
    ) : [[]];
    if (!tokens.length) { await conn.rollback(); return null; }
    await conn.query('UPDATE users SET password_hash = ?, must_change_password = FALSE, refresh_token_version = refresh_token_version + 1 WHERE id = ?', [passwordHash, userId]);
    await conn.query('UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND used_at IS NULL', [userId]);
    await conn.query("UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(3) WHERE account_kind = 'wellness' AND account_id = ? AND revoked_at IS NULL", [userId]);
    await conn.commit();
    return userId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
