import { pool } from '../db/pool.js';

export async function findUserPhoto(userId) {
  const [rows] = await pool.execute('SELECT image, mime_type FROM user_photos WHERE user_id = ?', [userId]);
  return rows[0] ?? null;
}

export async function saveUserPhoto(userId, image, mimeType) {
  await pool.execute(
    'INSERT INTO user_photos (user_id, image, mime_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE image = VALUES(image), mime_type = VALUES(mime_type)',
    [userId, image, mimeType]
  );
}

export async function deleteUserPhoto(userId) {
  await pool.execute('DELETE FROM user_photos WHERE user_id = ?', [userId]);
}
