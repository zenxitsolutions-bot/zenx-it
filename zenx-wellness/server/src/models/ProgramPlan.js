import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

const PROGRAM_PLAN_COLUMNS = { name: 'name', description: 'description', active: 'active' };

function mapProgramPlan(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// { companyId, activeOnly? } — the create-client dropdowns only want active plans; the admin
// management screen wants every plan, active or not, so it can still list (and reactivate) an
// inactive one. companyId required, same reasoning as User.js#listUsers.
export async function listProgramPlans({ companyId, activeOnly = false } = {}) {
  if (!companyId) throw new Error('listProgramPlans: companyId is required');
  const whereSql = activeOnly ? ' AND active = TRUE' : '';
  const [rows] = await pool.query(`SELECT * FROM program_plans WHERE company_id = ?${whereSql} ORDER BY name ASC`, [companyId]);
  return rows.map(mapProgramPlan);
}

export async function findProgramPlanById(id) {
  const [rows] = await pool.query('SELECT * FROM program_plans WHERE id = ? LIMIT 1', [id]);
  return mapProgramPlan(rows[0]);
}

export async function createProgramPlan({ companyId, name, description = null, active = true }) {
  if (!companyId) throw new Error('createProgramPlan: companyId is required');
  const id = newId();
  await pool.query('INSERT INTO program_plans (id, company_id, name, description, active) VALUES (?, ?, ?, ?, ?)', [
    id,
    companyId,
    name,
    description,
    active,
  ]);
  return findProgramPlanById(id);
}

export async function updateProgramPlanById(id, patch) {
  const { sets, params } = buildSetClause(PROGRAM_PLAN_COLUMNS, patch);
  if (sets.length) {
    await pool.query(`UPDATE program_plans SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  return findProgramPlanById(id);
}
