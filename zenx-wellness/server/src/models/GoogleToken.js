import { pool } from '../db/pool.js';

// One row per dietitian who has connected their Google account (schema.sql#google_oauth_tokens).
// Row present == connected, so "disconnect" deletes rather than blanking.
function toShape(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    googleEmail: row.google_email,
    refreshToken: row.refresh_token,
    accessToken: row.access_token,
    accessTokenExpiresAt: row.access_token_expires_at,
    scope: row.scope,
  };
}

export async function findGoogleToken(userId) {
  const [rows] = await pool.query('SELECT * FROM google_oauth_tokens WHERE user_id = ? LIMIT 1', [userId]);
  return toShape(rows[0]);
}

// Upsert: reconnecting replaces the grant rather than erroring on the primary key. `refresh_token`
// is only overwritten with a non-empty value — Google omits it on some re-grants, and writing that
// absence would silently break the connection on the next access-token expiry.
export async function saveGoogleTokens({ userId, googleEmail, refreshToken, accessToken, accessTokenExpiresAt, scope }) {
  await pool.query(
    `INSERT INTO google_oauth_tokens (user_id, google_email, refresh_token, access_token, access_token_expires_at, scope)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       google_email = VALUES(google_email),
       refresh_token = COALESCE(NULLIF(VALUES(refresh_token), ''), refresh_token),
       access_token = VALUES(access_token),
       access_token_expires_at = VALUES(access_token_expires_at),
       scope = VALUES(scope)`,
    [userId, googleEmail, refreshToken, accessToken, accessTokenExpiresAt, scope]
  );
  return findGoogleToken(userId);
}

export async function updateAccessToken({ userId, accessToken, accessTokenExpiresAt }) {
  await pool.query('UPDATE google_oauth_tokens SET access_token = ?, access_token_expires_at = ? WHERE user_id = ?', [
    accessToken,
    accessTokenExpiresAt,
    userId,
  ]);
}

export async function deleteGoogleToken(userId) {
  await pool.query('DELETE FROM google_oauth_tokens WHERE user_id = ?', [userId]);
}
