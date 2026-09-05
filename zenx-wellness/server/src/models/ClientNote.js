import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

function mapClientNote(row) {
  if (!row) return null;
  return {
    id: row.id,
    client: row.client_id,
    author: row.author_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listClientNotes(clientId) {
  const [rows] = await pool.query(
    `SELECT cn.*, u.name AS author_name
     FROM client_notes cn
     JOIN users u ON u.id = cn.author_id
     WHERE cn.client_id = ?
     ORDER BY cn.created_at DESC`,
    [clientId]
  );
  return rows.map(mapClientNote);
}

export async function findClientNoteById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT cn.*, u.name AS author_name
     FROM client_notes cn
     JOIN users u ON u.id = cn.author_id
     WHERE cn.id = ? LIMIT 1`,
    [id]
  );
  return mapClientNote(rows[0]);
}

// conn: pass the caller's own transaction connection when creating a note as part of a larger
// atomic operation (e.g. enquiry.controller.js copying enquiry history onto a newly-converted
// client) — see findUserById's own conn comment for why reading back needs the same connection.
export async function createClientNote({ client, author, body }, conn = pool) {
  const id = newId();
  await conn.query('INSERT INTO client_notes (id, client_id, author_id, body) VALUES (?, ?, ?, ?)', [
    id,
    client,
    author,
    body,
  ]);
  return findClientNoteById(id, conn);
}

export async function updateClientNoteById(id, { body }) {
  await pool.query('UPDATE client_notes SET body = ? WHERE id = ?', [body, id]);
  return findClientNoteById(id);
}

export async function deleteClientNoteById(id) {
  const existing = await findClientNoteById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM client_notes WHERE id = ?', [id]);
  return existing;
}
