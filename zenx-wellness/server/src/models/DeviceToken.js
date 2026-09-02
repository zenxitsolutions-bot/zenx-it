import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

export async function upsertDeviceToken({ userId, token, platform = 'web' }) {
  const id = newId();
  await pool.query(
    `INSERT INTO device_tokens (id, user_id, token, platform)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform), last_seen_at = CURRENT_TIMESTAMP(3)`,
    [id, userId, token, platform]
  );
  const [rows] = await pool.query('SELECT * FROM device_tokens WHERE token = ? LIMIT 1', [token]);
  return rows[0] || null;
}

export async function listTokensForUser(userId) {
  const [rows] = await pool.query('SELECT * FROM device_tokens WHERE user_id = ?', [userId]);
  return rows;
}

export async function deleteToken(token) {
  await pool.query('DELETE FROM device_tokens WHERE token = ?', [token]);
}

export async function deleteTokensForUser(userId) {
  await pool.query('DELETE FROM device_tokens WHERE user_id = ?', [userId]);
}
