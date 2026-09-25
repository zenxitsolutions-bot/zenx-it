import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { pool } from '../../src/db/pool.js';
import { listMessages } from '../../src/controllers/message.controller.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

test('history pagination preserves conversation and company boundaries', async (t) => {
  const users = new Map([
    ['client-a', { id: 'client-a', company_id: 'company-a', assigned_dietitian_id: 'dietitian-a' }],
    ['client-b', { id: 'client-b', company_id: 'company-b', assigned_dietitian_id: 'dietitian-a' }],
    ['client-c', { id: 'client-c', company_id: 'company-a', assigned_dietitian_id: 'dietitian-c' }],
    ['unassigned', { id: 'unassigned', company_id: 'company-a' }],
  ]);
  const historyReads = [];
  t.mock.method(pool, 'query', async (sql, params) => {
    if (sql.includes('FROM users u') && sql.includes('WHERE u.id = ?')) return [[users.get(params[0])].filter(Boolean)];
    if (sql.includes('FROM messages')) {
      historyReads.push(params);
      return [[{ id: 'm1', client_id: params[0], dietitian_id: params[1], sender_id: params[0], body: 'Only this conversation', created_at: new Date('2026-09-24T13:00:00Z'), read_at: null }]];
    }
    throw new Error('Unexpected database operation in history test');
  });
  const app = express();
  // Inject a known authenticated identity; production authentication is tested independently.
  app.get('/messages', (req, _res, next) => {
    req.user = req.headers['x-viewer'] === 'client'
      ? { id: 'client-a', role: 'client', companyId: 'company-a' }
      : req.headers['x-viewer'] === 'unassigned'
        ? { id: 'unassigned', role: 'client', companyId: 'company-a' }
        : { id: 'dietitian-a', role: 'dietitian', companyId: 'company-a' };
    next();
  }, listMessages);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/messages`;
  try {
    let response = await fetch(`${url}?client=client-a&limit=10`);
    assert.equal(response.status, 200);
    const page = await response.json();
    assert.equal(page.messages[0]._id, 'm1');
    assert.equal(page.messages[0].client, 'client-a');
    assert.equal(page.messages[0].id, undefined);
    assert.deepEqual(page.conversation, { client: 'client-a', dietitian: 'dietitian-a' });
    assert.equal(historyReads[0].at(-1), 11);
    const reads = historyReads.length;
    for (const [query, status] of [['client=client-b', 404], ['client=client-c', 403], ['', 400], ['client=client-a&limit=101', 400], ['client=client-a&before=invalid', 400], ['client=client-a&client=client-b', 400]]) {
      response = await fetch(`${url}?${query}`);
      assert.equal(response.status, status, query);
    }
    assert.equal(historyReads.length, reads, 'denied requests must not query message data');
    response = await fetch(`${url}?client=client-b&after=${page.pageInfo.endCursor}`, { headers: { 'x-viewer': 'client' } });
    assert.equal(response.status, 200);
    assert.deepEqual(historyReads.at(-1).slice(0, 2), ['client-a', 'dietitian-a'], 'client cannot choose another conversation');
    users.get('client-a').assigned_dietitian_id = 'dietitian-c';
    response = await fetch(`${url}?after=${page.pageInfo.endCursor}`, { headers: { 'x-viewer': 'client' } });
    const reassigned = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(reassigned.conversation, { client: 'client-a', dietitian: 'dietitian-c' }, 'even a cursor response reports the currently authorized conversation');
    assert.deepEqual(historyReads.at(-1).slice(0, 2), ['client-a', 'dietitian-c']);
    response = await fetch(url, { headers: { 'x-viewer': 'unassigned' } });
    assert.deepEqual(await response.json(), { conversation: null, messages: [], pageInfo: { hasMore: false, startCursor: null, endCursor: null } });
  } finally {
    server.close();
    server.closeAllConnections();
    await once(server, 'close');
  }
});
