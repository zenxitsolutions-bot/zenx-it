import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

export async function createInteraction({ enquiryId, adminId, contactType, comment, outcome, nextAction }) {
  const id = newId();
  await pool.query(
    'INSERT INTO interactions (id, enquiry_id, admin_id, contact_type, comment, outcome, next_action) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, enquiryId, adminId, contactType, comment, outcome, nextAction ?? null]
  );
  const [rows] = await pool.query('SELECT * FROM interactions WHERE id = ? LIMIT 1', [id]);
  return rows[0];
}

export async function listInteractions() {
  const [rows] = await pool.query('SELECT * FROM interactions ORDER BY created_at DESC');
  return rows;
}

export async function listInteractionsForEnquiry(enquiryId) {
  const [rows] = await pool.query('SELECT * FROM interactions WHERE enquiry_id = ? ORDER BY created_at DESC', [enquiryId]);
  return rows;
}
