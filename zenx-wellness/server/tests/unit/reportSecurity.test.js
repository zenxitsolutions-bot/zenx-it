import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { addReportFeedback } from '../../src/controllers/report.controller.js';
import { createReportSchema } from '../../src/schemas/report.schema.js';
import { authorize } from '../../src/middleware/authorize.js';

test('report feedback is restricted to the assigned dietitian or same-company admin', async (t) => {
  const writes = [];
  const report = { id: 'report-a', client_id: 'client-a', status: 'pending', file_name: 'lab.pdf', file_path: 'lab.pdf' };
  const client = { id: 'client-a', role: 'client', company_id: 'company-a', assigned_dietitian_id: 'assigned' };
  async function query(sql, params) {
    if (sql.startsWith('SELECT * FROM reports')) return [[params[0] === report.id ? report : null].filter(Boolean)];
    if (sql.includes('FROM report_feedback')) return [[]];
    if (sql.includes('FROM users u')) return [[client]];
    if (sql.startsWith('INSERT INTO report_feedback') || sql.startsWith('UPDATE reports SET status')) { writes.push(sql); return [{ affectedRows: 1 }]; }
    throw new Error('Unexpected query in report-security fixture');
  }
  t.mock.method(pool, 'query', query);
  t.mock.method(pool, 'getConnection', async () => ({ query, async beginTransaction() {}, async commit() {}, async rollback() {}, release() {} }));
  async function feedback(id, role, companyId, reportId = report.id) {
    const req = { user: { id, role, companyId, name: 'Fixture' }, params: { id: reportId }, body: { message: 'Reviewed', status: 'reviewed' } };
    let error, result;
    authorize('dietitian', 'admin')(req, {}, (err) => { error = err; });
    if (!error) await addReportFeedback(req, { json(body) { result = body; } }, (err) => { error = err; });
    return { error, result };
  }
  for (const args of [ ['unassigned', 'dietitian', 'company-a'], ['foreign', 'admin', 'company-b'], ['foreign', 'dietitian', 'company-b'], ['client-a', 'client', 'company-a'] ]) {
    const before = writes.length;
    const { error } = await feedback(...args);
    assert.ok(error && [403, 404].includes(error.status));
    assert.equal(writes.length, before, 'denied requests must not mutate feedback or status');
  }
  assert.equal((await feedback('assigned', 'dietitian', 'company-a')).error, undefined);
  assert.equal((await feedback('admin-a', 'admin', 'company-a')).error, undefined);
  assert.equal(writes.length, 4);
  assert.equal((await feedback('assigned', 'dietitian', 'company-a', 'missing')).error.status, 404);
});

test('multipart report metadata rejects objects and oversized notes before file persistence', () => {
  assert.deepEqual(createReportSchema.parse({ note: '  Lab result  ' }), { note: 'Lab result' });
  assert.deepEqual(createReportSchema.parse({}), {});
  for (const body of [{ note: { nested: 'value' } }, { note: ['one', 'two'] }, { note: 'x'.repeat(4001) }, { note: '😀'.repeat(1001) }, { unknown: 'value' }]) {
    assert.equal(createReportSchema.safeParse(body).success, false);
  }
});
