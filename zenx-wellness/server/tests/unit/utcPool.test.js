import test from 'node:test';
import assert from 'node:assert/strict';
import { withUtcSessions } from '../../src/db/utcPool.js';

const UTC_SQL = "SET SESSION time_zone = '+00:00'";

function fixture({ setupError, queryError } = {}) {
  const events = [];
  const result = [[{ timestamp: '2026-09-21T14:00:00.000Z' }]];
  const connection = {
    async query(...args) {
      events.push(['query', ...args]);
      if (args[0] === UTC_SQL && setupError) throw setupError;
      if (args[0] !== UTC_SQL && queryError) throw queryError;
      return result;
    },
    async execute(...args) { events.push(['execute', ...args]); return result; },
    async beginTransaction() { events.push(['begin']); },
    release() { events.push(['release']); },
    destroy() { events.push(['destroy']); },
  };
  const raw = {
    async getConnection() { events.push(['acquire']); return connection; },
    async end() { events.push(['end']); },
  };
  return { pool: withUtcSessions(raw), connection, events, result };
}

test('ordinary queries await a UTC session before SQL using MySQL clock defaults', async () => {
  const { pool, events, result } = fixture();
  assert.equal(await pool.query('SELECT NOW(3)', [42]), result);
  assert.deepEqual(events, [['acquire'], ['query', UTC_SQL], ['query', 'SELECT NOW(3)', [42]], ['release']]);
});

test('prepared statements and a re-used connection receive the same UTC setup', async () => {
  const { pool, events, result } = fixture();
  assert.equal(await pool.execute('SELECT ?', ['first']), result);
  await pool.execute('SELECT ?', ['second']);
  assert.equal(events.filter(([method, sql]) => method === 'query' && sql === UTC_SQL).length, 2);
  assert.equal(events.filter(([method]) => method === 'release').length, 2);
  assert.deepEqual(events[2], ['execute', 'SELECT ?', ['first']]);
});

test('transaction checkout is UTC-ready before BEGIN and does not release early', async () => {
  const { pool, connection, events } = fixture();
  const conn = await pool.getConnection();
  assert.equal(conn, connection);
  await conn.beginTransaction();
  assert.deepEqual(events, [['acquire'], ['query', UTC_SQL], ['begin']]);
  conn.release();
});

test('session setup failure destroys the connection and never executes application SQL', async () => {
  const setupError = new Error('Cannot set session timezone');
  const { pool, events } = fixture({ setupError });
  await assert.rejects(pool.query('INSERT INTO messages VALUES (?)', ['hello']), (err) => err === setupError);
  assert.deepEqual(events, [['acquire'], ['query', UTC_SQL], ['destroy']]);
});

test('application query failure still returns a healthy connection to the pool', async () => {
  const queryError = new Error('Rejected application query');
  const { pool, events } = fixture({ queryError });
  await assert.rejects(pool.query('SELECT bad_column'), (err) => err === queryError);
  assert.deepEqual(events.at(-1), ['release']);
});

test('pool shutdown is forwarded', async () => {
  const { pool, events } = fixture();
  await pool.end();
  assert.deepEqual(events, [['end']]);
});
