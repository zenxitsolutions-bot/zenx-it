import { pool, withTransaction } from '../db/pool.js';
import { newId } from '../db/id.js';

function mapReport(row, feedback = [], clientName) {
  const report = {
    id: row.id,
    client: clientName !== undefined ? { _id: row.client_id, name: clientName } : row.client_id,
    fileName: row.file_name,
    filePath: row.file_path,
    note: row.note,
    status: row.status,
    feedback,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return report;
}

// _id (not id) because this object is nested inside a report and never passes through
// toClientShape itself — the client uses entry._id directly as a React key.
function mapFeedback(row) {
  return {
    _id: row.id,
    author: row.author_id,
    authorName: row.author_name,
    message: row.message,
    createdAt: row.created_at,
  };
}

async function feedbackByReportIds(reportIds) {
  if (reportIds.length === 0) return new Map();
  const [rows] = await pool.query(
    `SELECT * FROM report_feedback WHERE report_id IN (${reportIds.map(() => '?').join(',')}) ORDER BY created_at ASC`,
    reportIds
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.report_id)) map.set(row.report_id, []);
    map.get(row.report_id).push(mapFeedback(row));
  }
  return map;
}

// filter: { companyId, client? } or { companyId, clientIn: string[] } — matches .populate('client', 'name').
// companyId required (no direct company_id column on reports; scoped via the owning client's own
// company, same transitive-scoping design used throughout).
export async function listReports(filter = {}) {
  if (!filter.companyId) throw new Error('listReports: companyId is required');
  const where = ['u.company_id = ?'];
  const params = [filter.companyId];
  if (filter.client) {
    where.push('r.client_id = ?');
    params.push(filter.client);
  } else if (filter.clientIn) {
    if (filter.clientIn.length === 0) return [];
    where.push(`r.client_id IN (${filter.clientIn.map(() => '?').join(',')})`);
    params.push(...filter.clientIn);
  }
  const [rows] = await pool.query(
    `SELECT r.*, u.name AS client_name FROM reports r JOIN users u ON u.id = r.client_id WHERE ${where.join(' AND ')} ORDER BY r.created_at DESC`,
    params
  );
  const feedbackByReport = await feedbackByReportIds(rows.map((r) => r.id));
  return rows.map((row) => mapReport(row, feedbackByReport.get(row.id) ?? [], row.client_name));
}

export async function findReportById(id) {
  const [rows] = await pool.query('SELECT * FROM reports WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
  const feedbackByReport = await feedbackByReportIds([id]);
  return mapReport(rows[0], feedbackByReport.get(id) ?? []);
}

export async function createReport({ client, fileName, filePath, note = null }) {
  const id = newId();
  await pool.query(
    'INSERT INTO reports (id, client_id, file_name, file_path, note) VALUES (?, ?, ?, ?, ?)',
    [id, client, fileName, filePath, note]
  );
  return findReportById(id);
}

// Appends one feedback entry and updates the report's status in a single transaction — a report
// can go through several rounds of dietitian review (report.controller.js#addReportFeedback).
export async function addReportFeedback(reportId, { authorId, authorName, message, status }) {
  await withTransaction(async (conn) => {
    await conn.query(
      'INSERT INTO report_feedback (id, report_id, author_id, author_name, message) VALUES (?, ?, ?, ?, ?)',
      [newId(), reportId, authorId, authorName, message]
    );
    await conn.query('UPDATE reports SET status = ? WHERE id = ?', [status, reportId]);
  });
  return findReportById(reportId);
}

export async function deleteReportById(id) {
  const existing = await findReportById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM reports WHERE id = ?', [id]);
  return existing;
}
