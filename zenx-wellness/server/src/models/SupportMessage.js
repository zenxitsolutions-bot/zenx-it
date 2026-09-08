import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { isUserOnline } from '../services/messageLive.js';

function mapMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    dietitian: row.dietitian_id,
    sender: row.sender_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
    channel: 'support',
  };
}

export async function listSupportMessages(companyId, dietitianId) {
  const [rows] = await pool.query(
    'SELECT * FROM support_messages WHERE company_id = ? AND dietitian_id = ? ORDER BY created_at ASC',
    [companyId, dietitianId]
  );
  return rows.map(mapMessage);
}

export async function createSupportMessage({ companyId, dietitianId, sender, body }) {
  const id = newId();
  await pool.query(
    'INSERT INTO support_messages (id, company_id, dietitian_id, sender_id, body) VALUES (?, ?, ?, ?, ?)',
    [id, companyId, dietitianId, sender, body]
  );
  const [rows] = await pool.query('SELECT * FROM support_messages WHERE id = ? LIMIT 1', [id]);
  return mapMessage(rows[0]);
}

export async function markSupportThreadRead(companyId, dietitianId, readerId) {
  await pool.query(
    `UPDATE support_messages SET read_at = CURRENT_TIMESTAMP(3)
     WHERE company_id = ? AND dietitian_id = ? AND sender_id != ? AND read_at IS NULL`,
    [companyId, dietitianId, readerId]
  );
}

export async function countUnreadSupportForDietitian(dietitianId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM support_messages
     WHERE dietitian_id = ? AND sender_id != dietitian_id AND read_at IS NULL`,
    [dietitianId]
  );
  return Number(rows[0].count);
}

export async function countUnreadSupportForAdmin(companyId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM support_messages
     WHERE company_id = ? AND sender_id = dietitian_id AND read_at IS NULL`,
    [companyId]
  );
  return Number(rows[0].count);
}

export async function listSupportConversationsForAdmin(companyId) {
  const [rows] = await pool.query(
    `SELECT u.id AS dietitian_id, u.name AS dietitian_name,
       lm.body AS last_body, lm.sender_id AS last_sender_id, lm.created_at AS last_created_at,
       COALESCE(uc.unread_count, 0) AS unread_count
     FROM users u
     LEFT JOIN (
       SELECT dietitian_id, body, sender_id, created_at FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY dietitian_id ORDER BY created_at DESC) AS rn
         FROM support_messages WHERE company_id = ?
       ) ranked WHERE rn = 1
     ) lm ON lm.dietitian_id = u.id
     LEFT JOIN (
       SELECT dietitian_id, COUNT(*) AS unread_count FROM support_messages
       WHERE company_id = ? AND sender_id = dietitian_id AND read_at IS NULL
       GROUP BY dietitian_id
     ) uc ON uc.dietitian_id = u.id
     WHERE u.role = 'dietitian' AND u.company_id = ?
     ORDER BY lm.created_at IS NULL, lm.created_at DESC, u.name ASC`,
    [companyId, companyId, companyId]
  );
  return rows.map((row) => ({
    dietitian: { _id: row.dietitian_id, name: row.dietitian_name },
    lastMessage: row.last_created_at
      ? { body: row.last_body, sender: row.last_sender_id, createdAt: row.last_created_at }
      : null,
    unreadCount: Number(row.unread_count),
    online: isUserOnline(row.dietitian_id),
  }));
}
