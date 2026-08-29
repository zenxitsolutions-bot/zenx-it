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
  await pool.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [row.id]);
  return row;
}
