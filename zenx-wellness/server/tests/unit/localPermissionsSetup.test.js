import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LOCAL_PERMISSION_TABLES, parseLocalSetupArgs, assertLocalSetupEnvironment,
  extractLocalSetupStatements, verifyLocalSetupTables,
} from '../../src/scripts/localPermissionsSetup.js';

const fails = (code) => (error) => error.code === code;

test('local bootstrap requires explicit unique company/email/confirmation flags', () => {
  assert.deepEqual(parseLocalSetupArgs(['--company-slug', 'practice', '--email', 'Admin@Example.test', '--confirm']), { companySlug: 'practice', email: 'admin@example.test' });
  for (const args of [[], ['--confirm'], ['--company-slug', '--confirm'], ['--company-slug', 'practice', '--email', 'a@example.test'],
    ['--company-slug', 'practice', '--email', 'a@example.test', '--confirm', '--confirm'], ['--unexpected', 'value']]) {
    assert.throws(() => parseLocalSetupArgs(args), fails('ERR_LOCAL_SETUP_USAGE'));
  }
});

test('local bootstrap rejects production, remote hosts and hostname aliases before creating a pool', () => {
  for (const host of ['127.0.0.1', '[::1]']) assert.doesNotThrow(() => assertLocalSetupEnvironment({ nodeEnv: 'development', mysqlUrl: `mysql://u:p@${host}:3306/local` }));
  for (const nodeEnv of ['production', 'PRODUCTION', ' production ']) assert.throws(() => assertLocalSetupEnvironment({ nodeEnv, mysqlUrl: 'mysql://u:p@127.0.0.1/local' }), fails('ERR_LOCAL_SETUP_PRODUCTION'));
  for (const url of ['mysql://u:p@localhost/local', 'mysql://u:p@db.example.test/local', 'mysql://u:p@127.0.0.1.example.test/local', 'mysql://u:p@192.168.1.1/local', 'mysql://u:p@127.1/local', 'https://u:p@127.0.0.1/local']) {
    assert.throws(() => assertLocalSetupEnvironment({ nodeEnv: 'development', mysqlUrl: url }), fails('ERR_LOCAL_SETUP_NOT_LOOPBACK'));
  }
  assert.throws(() => assertLocalSetupEnvironment({ nodeEnv: 'development', mysqlUrl: 'secret-invalid-url' }), fails('ERR_LOCAL_SETUP_DATABASE'));
});

test('local bootstrap extracts exactly the four additive prerequisites, never broad migrations', () => {
  const schema = readFileSync(new URL('../../src/db/schema.sql', import.meta.url), 'utf8');
  const statements = extractLocalSetupStatements(schema);
  assert.deepEqual(statements.map(({ table }) => table), Object.keys(LOCAL_PERMISSION_TABLES));
  assert.equal(statements.length, 4);
  for (const { statement } of statements) {
    assert.ok(statement.startsWith('CREATE TABLE IF NOT EXISTS '));
    assert.equal(statement.match(/;/g).length, 1);
    assert.doesNotMatch(statement, /\b(?:ALTER|DROP|UPDATE|DELETE|TRUNCATE)\s+TABLE\b/);
  }
  assert.throws(() => extractLocalSetupStatements(''), fails('ERR_LOCAL_SETUP_SCHEMA'));
  assert.throws(() => extractLocalSetupStatements(`${schema}\n${statements[0].statement}`), fails('ERR_LOCAL_SETUP_SCHEMA'));
});

test('existing setup tables must be InnoDB with the exact expected column sets', () => {
  const tables = Object.keys(LOCAL_PERMISSION_TABLES).map((table_name) => ({ table_name, engine: 'InnoDB' }));
  const columns = Object.entries(LOCAL_PERMISSION_TABLES).flatMap(([table_name, names]) => names.map((column_name) => ({ table_name, column_name })));
  assert.deepEqual([...verifyLocalSetupTables([], [])], []);
  assert.equal(verifyLocalSetupTables(tables, columns, { requireAll: true }).size, 4);
  assert.throws(() => verifyLocalSetupTables([], [], { requireAll: true }), fails('ERR_LOCAL_SETUP_TABLE_ENGINE'));
  assert.throws(() => verifyLocalSetupTables([{ ...tables[0], engine: 'MyISAM' }], columns), fails('ERR_LOCAL_SETUP_TABLE_ENGINE'));
  assert.throws(() => verifyLocalSetupTables(tables, columns.slice(1)), fails('ERR_LOCAL_SETUP_TABLE_COLUMNS'));
  assert.throws(() => verifyLocalSetupTables(tables, [...columns, { table_name: 'auth_sessions', column_name: 'unknown' }]), fails('ERR_LOCAL_SETUP_TABLE_COLUMNS'));
});
