import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { isUserOnline } from '../services/messageLive.js';

function mapMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    client: row.client_id,
    dietitian: row.dietitian_id,
    sender: row.sender_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

// Full history for one conversation, chronological (oldest first — chat reading order).
export async function listMessages(clientId, dietitianId) {
  const [rows] = await pool.query(
    'SELECT * FROM messages WHERE client_id = ? AND dietitian_id = ? ORDER BY created_at ASC',
    [clientId, dietitianId]
  );
  return rows.map(mapMessage);
}

export async function createMessage({ client, dietitian, sender, body }) {
  const id = newId();
  await pool.query('INSERT INTO messages (id, client_id, dietitian_id, sender_id, body) VALUES (?, ?, ?, ?, ?)', [
    id,
    client,
    dietitian,
    sender,
    body,
  ]);
  const [rows] = await pool.query('SELECT * FROM messages WHERE id = ? LIMIT 1', [id]);
  return mapMessage(rows[0]);
}

// Stamps read_at on every message in this conversation the reader didn't send themselves — called
// when a conversation is opened/polled by either party.
export async function markConversationRead(clientId, dietitianId, readerId) {
  await pool.query(
    'UPDATE messages SET read_at = CURRENT_TIMESTAMP(3) WHERE client_id = ? AND dietitian_id = ? AND sender_id != ? AND read_at IS NULL',
    [clientId, dietitianId, readerId]
  );
}

// Unread count for the client's own (single) conversation with their current dietitian.
export async function countUnreadForClient(clientId, dietitianId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM messages WHERE client_id = ? AND dietitian_id = ? AND sender_id = dietitian_id AND read_at IS NULL',
    [clientId, dietitianId]
  );
  return Number(rows[0].count);
}

// Total unread across every conversation this dietitian is in — for a single nav badge, not the
// per-conversation counts (see listConversationsForDietitian for those).
export async function countUnreadForDietitian(dietitianId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM messages WHERE dietitian_id = ? AND sender_id = client_id AND read_at IS NULL',
    [dietitianId]
  );
  return Number(rows[0].count);
}

// One row per client currently assigned to this dietitian (even one with no messages yet, so the
// dietitian can start a conversation), each with its latest message and unread count. Ordered
// most-recently-active first, then alphabetically among conversations that haven't started yet.
export async function listConversationsForDietitian(dietitianId) {
  const [rows] = await pool.query(
    `SELECT u.id AS client_id, u.name AS client_name,
       lm.body AS last_body, lm.sender_id AS last_sender_id, lm.created_at AS last_created_at,
       COALESCE(uc.unread_count, 0) AS unread_count
     FROM users u
     LEFT JOIN (
       SELECT client_id, body, sender_id, created_at FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY created_at DESC) AS rn
         FROM messages WHERE dietitian_id = ?
       ) ranked WHERE rn = 1
     ) lm ON lm.client_id = u.id
     LEFT JOIN (
       SELECT client_id, COUNT(*) AS unread_count FROM messages
       WHERE dietitian_id = ? AND sender_id = client_id AND read_at IS NULL
       GROUP BY client_id
     ) uc ON uc.client_id = u.id
     WHERE u.role = 'client' AND u.assigned_dietitian_id = ?
     ORDER BY lm.created_at IS NULL, lm.created_at DESC, u.name ASC`,
    [dietitianId, dietitianId, dietitianId]
  );
  return rows.map((row) => ({
    client: { _id: row.client_id, name: row.client_name },
    lastMessage: row.last_created_at
      ? { body: row.last_body, sender: row.last_sender_id, createdAt: row.last_created_at }
      : null,
    unreadCount: Number(row.unread_count),
    online: isUserOnline(row.client_id),
  }));
}
