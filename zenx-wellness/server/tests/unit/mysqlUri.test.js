import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';
import mysql from 'mysql2/promise';
import { mysqlUri } from '../../src/config/security.js';

const valid = 'mysql://app:encoded%40password@127.0.0.1:3306/application_db';
const source = (value) => ({ NODE_ENV: 'production', MYSQL_URL: value });
test('database URI defaults, optional integration and encoded credentials remain compatible', () => {
  assert.equal(mysqlUri('MYSQL_URL', valid, { source: {} }), valid);
  assert.equal(mysqlUri('MYSQL_URL', '', { source: source(valid) }), valid);
  assert.equal(mysqlUri('WELLNESS_MYSQL_URL', '', { source: { NODE_ENV: 'production' }, required: false }), '');
  assert.equal(mysqlUri('WELLNESS_MYSQL_URL', '', { source: { WELLNESS_MYSQL_URL: ' ' }, required: false }), '');
  assert.equal(mysqlUri('MYSQL_URL', '', { source: source(valid + '?timezone=+05:30') }), valid + '?timezone=+05:30');
  assert.equal(mysqlUri('MYSQL_URL', '', { source: source('mysql://root:@localhost/db') }), 'mysql://root:@localhost/db');
  assert.equal(mysqlUri('MYSQL_URL', '', { source: source('mysql://app:pass@[::1]:3306/db') }), 'mysql://app:pass@[::1]:3306/db');
  assert.throws(() => mysqlUri('MYSQL_URL', valid, { source: { NODE_ENV: 'production' } }), /MYSQL_URL/);
});
test('malformed database URLs and option values never survive inside validation errors', () => {
  const secret = 'synthetic-credential-canary';
  for (const value of [
    `mysql://app:${secret}@[broken/db`, `https://app:${secret}@host/db`,
    `mysql://app:${secret}@host`, `mysql://app:${secret}@/db`,
    `mysql://app:${secret}@host:99999/db`, `mysql://app:${secret}@host:0/db`,
    `mysql://app:${secret}%ZZ@host/db`, `mysql://app:${secret}@host/db#fragment`,
    `mysql://app:${secret}@host/db%2Fother`, `mysql://app:${secret}@host/db%00`,
    `mysql://app:${secret}@host/db?charset=${secret}`,
    `mysql://app:${secret}@host/db?ssl=${secret}`,
    `mysql://app:${secret}@host/db?${secret}=true`,
    valid + '?debug=true', valid + '?multipleStatements=true', valid + '?connectionLimit=0',
    valid + '?connectionLimit=10&connectionLimit=20', valid + '?timezone=bad',
    valid + '?dateStrings=%7B%22secret%22%3Atrue%7D',
    valid + '?ssl=' + encodeURIComponent(JSON.stringify({ rejectUnauthorized: false })),
  ]) {
    assert.throws(() => mysqlUri('MYSQL_URL', '', { source: source(value) }), (error) => {
      assert.match(error.message, /MYSQL_URL/);
      assert.doesNotMatch(inspect(error), /synthetic-credential-canary|input:|cause:/);
      return true;
    });
  }
});
test('safe mysql2 query options construct a pool without connections, warnings or parser errors', async (t) => {
  const warnings = [];
  t.mock.method(console, 'error', (...args) => warnings.push(args));
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const options = new URLSearchParams({
    connectionLimit: '5', queueLimit: '20', connectTimeout: '10000', waitForConnections: 'true',
    enableKeepAlive: 'true', charset: 'UTF8MB4_UNICODE_CI', timezone: '+05:30',
    dateStrings: JSON.stringify(['DATE']), ssl: JSON.stringify({ rejectUnauthorized: true, minVersion: 'TLSv1.2' }),
  });
  const uri = mysqlUri('MYSQL_URL', '', { source: source(valid + '?' + options) });
  const localPool = mysql.createPool({ uri, timezone: 'Z' });
  await localPool.end(); // Pool creation is lazy: no connection/query is made.
  assert.deepEqual(warnings, []);
});
test('invalid credential-bearing URI is sanitized before ESM database pool initialization', () => {
  const directory = fileURLToPath(new URL('../../', import.meta.url));
  const invalid = 'mysql://app:synthetic-import-secret@[broken/db';
  for (const variable of ['MYSQL_URL']) {
    const variables = { NODE_ENV: 'test', DOTENV_CONFIG_PATH: fileURLToPath(new URL('./nonexistent-env-fixture', import.meta.url)),
      MYSQL_URL: valid, WELLNESS_MYSQL_URL: '', [variable]: invalid };
    const child = spawnSync(process.execPath, ['--input-type=module', '--eval', "await import('./src/db/pool.js')"],
      { cwd: directory, env: variables, encoding: 'utf8', timeout: 10000 });
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, new RegExp(variable));
    assert.doesNotMatch(child.stdout + child.stderr, /synthetic-import-secret|input:|cause:/);
  }
});
