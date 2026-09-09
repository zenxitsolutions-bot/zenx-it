import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

function mapNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    user: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    url: row.url,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function createNotification({ userId, type = 'info', title, body = null, url = null }) {
  const id = newId();
  await pool.query(
    'INSERT INTO notifications (id, user_id, type, title, body, url) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, type, title, body, url]
  );
  const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [id]);
  return mapNotification(rows[0]);
}

export async function listNotificationsForUser(userId, { limit = 30 } = {}) {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    [userId, Number(limit) || 30]
  );
  return rows.map(mapNotification);
}

export async function findNotificationById(id) {
  const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [id]);
  return mapNotification(rows[0]);
}

export async function markNotificationRead(id, userId) {
  await pool.query(
    'UPDATE notifications SET read_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND user_id = ? AND read_at IS NULL',
    [id, userId]
  );
  return findNotificationById(id);
}

export async function markNotificationsReadByType(userId, type, urlIncludes) {
  if (!userId || !type) return;
  if (urlIncludes) {
    await pool.query(
      'UPDATE notifications SET read_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND type = ? AND read_at IS NULL AND url LIKE ?',
      [userId, type, `%${urlIncludes}%`]
    );
    return;
  }
  await pool.query(
    'UPDATE notifications SET read_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND type = ? AND read_at IS NULL',
    [userId, type]
  );
}

export async function markAllNotificationsRead(userId) {
  await pool.query(
    'UPDATE notifications SET read_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND read_at IS NULL',
    [userId]
  );
}

export async function countUnreadNotifications(userId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [userId]
  );
  return Number(rows[0].count ?? 0);
}
