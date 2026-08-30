import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

const PROGRESS_COLUMNS = {
  date: 'date',
  weight: 'weight',
  waist: 'waist',
  hip: 'hip',
  thigh: 'thigh',
  upperArm: 'upper_arm',
  energy: 'energy',
  adherence: 'adherence',
};

function toNumberOrNull(value) {
  return value === null ? null : Number(value);
}

function mapProgress(row) {
  if (!row) return null;
  return {
    id: row.id,
    client: row.client_id,
    date: row.date,
    weight: toNumberOrNull(row.weight),
    waist: toNumberOrNull(row.waist),
    hip: toNumberOrNull(row.hip),
    thigh: toNumberOrNull(row.thigh),
    upperArm: toNumberOrNull(row.upper_arm),
    energy: row.energy,
    adherence: row.adherence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProgress(filter = {}) {
  const where = [];
  const params = [];
  if (filter.client) {
    where.push('client_id = ?');
    params.push(filter.client);
  }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT * FROM progress${whereSql} ORDER BY date ASC`, params);
  return rows.map(mapProgress);
}

export async function findProgressById(id) {
  const [rows] = await pool.query('SELECT * FROM progress WHERE id = ? LIMIT 1', [id]);
  return mapProgress(rows[0]);
}

export async function createProgress({
  client,
  date,
  weight,
  waist = null,
  hip = null,
  thigh = null,
  upperArm = null,
  energy = null,
  adherence = null,
}) {
  const id = newId();
  await pool.query(
    'INSERT INTO progress (id, client_id, date, weight, waist, hip, thigh, upper_arm, energy, adherence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, client, date, weight, waist, hip, thigh, upperArm, energy, adherence]
  );
  return findProgressById(id);
}

export async function updateProgressById(id, patch) {
  const { sets, params } = buildSetClause(PROGRESS_COLUMNS, patch);
  if (sets.length) {
    await pool.query(`UPDATE progress SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  return findProgressById(id);
}

export async function deleteProgressById(id) {
  const existing = await findProgressById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM progress WHERE id = ?', [id]);
  return existing;
}

// Latest progress row per client — insights.controller.js#dietitianOverview's clientMomentum.
export async function latestProgressByClientIds(clientIds) {
  if (clientIds.length === 0) return [];
  const [rows] = await pool.query(
    `SELECT * FROM (
       SELECT p.*, ROW_NUMBER() OVER (PARTITION BY client_id ORDER BY date DESC) AS rn
       FROM progress p
       WHERE client_id IN (${clientIds.map(() => '?').join(',')})
     ) ranked
     WHERE rn = 1`,
    clientIds
  );
  return rows.map(mapProgress);
}
