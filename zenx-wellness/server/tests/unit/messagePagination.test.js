import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { listMessages } from '../../src/models/Message.js';
import { decodeMessageCursor, encodeMessageCursor, parseMessagePagination } from '../../src/utils/messagePagination.js';

test('pagination validates cursor shape, direction, and bounded page size', () => {
  assert.deepEqual(parseMessagePagination(), { limit: 50, direction: 'before', cursor: null });
  const message = { id: 'm-001', createdAt: new Date('2026-09-24T13:00:00.123Z') };
  const encoded = encodeMessageCursor(message);
  assert.deepEqual(decodeMessageCursor(encoded), { id: message.id, time: message.createdAt });
  assert.equal(parseMessagePagination({ after: encoded, limit: '100' }).direction, 'after');
  for (const query of [
    { limit: '0' }, { limit: '101' }, { limit: '-1' }, { limit: '2.5' }, { limit: 'Infinity' },
    { limit: ['50'] }, { before: '' }, { before: 'bad json' }, { after: ['abc'] },
    { before: encoded, after: encoded }, { before: 'a'.repeat(241) },
    { before: Buffer.from(JSON.stringify({ id: 'm1', time: 'not-a-time' })).toString('base64url') },
    { before: Buffer.from(JSON.stringify({ id: "x' OR 1=1", time: message.createdAt })).toString('base64url') },
  ]) {
    assert.throws(() => parseMessagePagination(query), (error) => error.status === 400);
  }
});

test('bounded history pages preserve every message across equal timestamps and new arrivals', async (t) => {
  const rows = Array.from({ length: 125 }, (_, index) => ({
    id: `m-${String(index).padStart(3, '0')}`, client_id: 'client-a', dietitian_id: 'dietitian-a',
    sender_id: 'client-a', body: `Message ${index}`, read_at: null,
    created_at: new Date('2026-09-24T13:00:00.123Z'),
  }));
  rows.push({ ...rows[0], id: 'foreign-message', client_id: 'client-b', dietitian_id: 'dietitian-b' });
  const requests = [];
  t.mock.method(pool, 'query', async (sql, params) => {
    requests.push({ sql, params });
    assert.match(sql, /WHERE client_id = \? AND dietitian_id = \?/);
    assert.match(sql, /ORDER BY created_at (?:ASC|DESC), id (?:ASC|DESC) LIMIT \?$/);
    assert.ok(params.at(-1) <= 101, 'every database request is bounded including lookahead');
    let selected = rows.filter((row) => row.client_id === params[0] && row.dietitian_id === params[1]);
    const after = sql.includes('created_at > ?');
    if (params.length > 3) {
      const boundary = { created_at: params[2], id: params[4] };
      selected = selected.filter((row) => {
        const comparison = row.created_at - boundary.created_at || row.id.localeCompare(boundary.id);
        return after ? comparison > 0 : comparison < 0;
      });
    }
    selected.sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id));
    if (!sql.includes('ORDER BY created_at ASC')) selected.reverse();
    return [selected.slice(0, params.at(-1))];
  });

  const latest = await listMessages('client-a', 'dietitian-a');
  assert.equal(latest.messages.length, 50);
  assert.equal(latest.messages[0].id, 'm-075');
  assert.equal(latest.messages.at(-1).id, 'm-124');
  assert.equal(latest.pageInfo.hasMore, true);
  const middle = await listMessages('client-a', 'dietitian-a', parseMessagePagination({ before: latest.pageInfo.startCursor }));
  const oldest = await listMessages('client-a', 'dietitian-a', parseMessagePagination({ before: middle.pageInfo.startCursor }));
  assert.equal(oldest.messages.length, 25);
  assert.equal(oldest.pageInfo.hasMore, false);
  const allIds = [...oldest.messages, ...middle.messages, ...latest.messages].map((message) => message.id);
  assert.equal(new Set(allIds).size, 125);
  assert.deepEqual(allIds, rows.filter((row) => row.client_id === 'client-a').map((row) => row.id));

  for (let index = 125; index < 240; index++) rows.push({ ...rows[0], id: `m-${index}`, body: `New ${index}` });
  let cursor = latest.pageInfo.endCursor;
  const newer = [];
  let page;
  do {
    page = await listMessages('client-a', 'dietitian-a', parseMessagePagination({ after: cursor }));
    newer.push(...page.messages);
    cursor = page.pageInfo.endCursor;
  } while (page.pageInfo.hasMore);
  assert.equal(newer.length, 115, 'catch-up uses successive bounded pages without skipping a gap');
  assert.equal(newer[0].id, 'm-125');
  assert.equal(newer.at(-1).id, 'm-239');
  const empty = await listMessages('client-a', 'dietitian-a', parseMessagePagination({ after: cursor }));
  assert.deepEqual(empty, { messages: [], pageInfo: { hasMore: false, startCursor: null, endCursor: null } });
  await listMessages('client-a', 'dietitian-a', { limit: 10_000 });
  assert.equal(requests.at(-1).params.at(-1), 101, 'model also caps trusted caller page sizes');
});
