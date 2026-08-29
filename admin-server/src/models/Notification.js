import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

function mapNotification(row) {
  if (!row) return null;
  return { ...row, read: Boolean(row.read) };
}

export async function createNotification({ kind, title, body, entityId }) {
  const id = newId();
  await pool.query('INSERT INTO notifications (id, kind, title, body, entity_id) VALUES (?, ?, ?, ?, ?)', [
    id,
    kind,
    title,
    body,
    entityId ?? null,
  ]);
  const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ?', [id]);
  return mapNotification(rows[0]);
}

export async function listNotifications(limit = 50) {
  const [rows] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.map(mapNotification);
}

export async function markNotificationRead(id) {
  await pool.query('UPDATE notifications SET `read` = TRUE WHERE id = ?', [id]);
}

export async function markAllNotificationsRead() {
  await pool.query("UPDATE notifications SET `read` = TRUE WHERE `read` = FALSE");
}
