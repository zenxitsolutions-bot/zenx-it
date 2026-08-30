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
