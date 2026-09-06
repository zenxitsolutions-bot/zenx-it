import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

export async function createAuditLog({ adminId, action, entityType, entityId, description }, conn = pool) {
  const id = newId();
  await conn.query(
    'INSERT INTO audit_logs (id, admin_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?, ?)',
    [id, adminId, action, entityType, entityId, description]
  );
}

export async function listAuditLogs() {
  const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC');
  return rows;
}
