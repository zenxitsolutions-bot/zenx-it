import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

export async function createApplicationAccess({ userId, companyId, application, role }, conn = pool) {
  const id = newId();
  await conn.query(
    `INSERT INTO application_access (id, user_id, company_id, application, role, status, activated_at)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP(3))`,
    [id, userId, companyId, application, role]
  );
  const [rows] = await conn.query('SELECT * FROM application_access WHERE id = ? LIMIT 1', [id]);
  return rows[0];
}

export async function listApplicationAccessForCompany(companyId) {
  const [rows] = await pool.query('SELECT * FROM application_access WHERE company_id = ?', [companyId]);
  return rows;
}

export async function findApplicationAccess(userId, companyId, application, conn = pool) {
  const [rows] = await conn.query(
    'SELECT * FROM application_access WHERE user_id = ? AND company_id = ? AND application = ? LIMIT 1',
    [userId, companyId, application]
  );
  return rows[0] || null;
}

export async function listActiveGrantsForUser(userId) {
  const [rows] = await pool.query("SELECT * FROM application_access WHERE user_id = ? AND status = 'ACTIVE'", [userId]);
  return rows;
}

export async function updateApplicationAccessStatus(id, status) {
  const extraCol = status === 'ACTIVE' ? 'activated_at' : 'deactivated_at';
  await pool.query(`UPDATE application_access SET status = ?, ${extraCol} = CURRENT_TIMESTAMP(3) WHERE id = ?`, [status, id]);
  const [rows] = await pool.query('SELECT * FROM application_access WHERE id = ?', [id]);
  return rows[0] || null;
}
