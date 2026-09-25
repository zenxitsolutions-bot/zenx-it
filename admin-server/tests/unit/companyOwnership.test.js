import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { initializeCompanyMainAdmin, reconcileCompanyMainAdmin } from '../../src/models/CompanyOwnership.js';

const activeAdmin = { id: 'original-admin', user_status: 'ACTIVE', grant_status: 'ACTIVE' };
function fixture({ company = { id: 'company', status: 'ACTIVE', main_admin_user_id: null }, candidates = [activeAdmin] } = {}) {
  const writes = [];
  const reads = [];
  const conn = { query: async (sql, values) => {
    if (sql.startsWith('SELECT id, status')) {
      assert.match(sql, /FOR UPDATE$/);
      assert.deepEqual(values, ['company']);
      reads.push('company');
      return [company ? [{ ...company }] : []];
    }
    if (sql.includes('FROM application_access aa')) {
      assert.deepEqual(reads, ['company']);
      assert.match(sql, /aa\.application = 'zenx-dietitian'.*aa\.role = 'wellness_admin'/);
      assert.match(sql, /FOR UPDATE$/);
      assert.doesNotMatch(sql, /(?:aa|u)\.status\s*=/, 'disabled candidates must still count');
      reads.push('candidates');
      return [values.length === 2 ? candidates.filter((candidate) => candidate.id === values[1]) : candidates];
    }
    if (sql.startsWith('UPDATE companies')) {
      assert.match(sql, /main_admin_user_id IS NULL$/);
      writes.push(values);
      company.main_admin_user_id = values[0];
      return [{ affectedRows: 1 }];
    }
    assert.fail('Unexpected query: ' + sql);
  } };
  return { conn, writes, reads, company };
}

test('new-company provisioning records its exact active Wellness admin identity', async () => {
  const state = fixture();
  assert.equal(await initializeCompanyMainAdmin({ companyId: 'company', userId: 'original-admin' }, state.conn), 'original-admin');
  assert.deepEqual(state.writes, [['original-admin', 'company']]);
});

test('new inactive company retains original-owner provenance without granting application access', async () => {
  const state = fixture({ company: { id: 'company', status: 'INACTIVE', main_admin_user_id: null } });
  assert.equal(await initializeCompanyMainAdmin({ companyId: 'company', userId: 'original-admin', allowInactiveCompany: true }, state.conn), 'original-admin');
  assert.equal(state.writes.length, 1);
});

test('explicit initialization never substitutes another user or promotes a user without the correct grant', async () => {
  const state = fixture();
  assert.equal(await initializeCompanyMainAdmin({ companyId: 'company', userId: 'different-user' }, state.conn), null);
  assert.equal(state.writes.length, 0);
});

test('legacy reconciliation persists the sole active platform admin and is then idempotent', async () => {
  const state = fixture();
  assert.equal(await reconcileCompanyMainAdmin({ companyId: 'company' }, state.conn), 'original-admin');
  state.reads.length = 0;
  assert.equal(await reconcileCompanyMainAdmin({ companyId: 'company' }, state.conn), 'original-admin');
  assert.equal(state.writes.length, 1);
  assert.deepEqual(state.reads, ['company']);
});

for (const [name, options] of [
  ['no platform admin', { candidates: [] }],
  ['multiple active admins', { candidates: [activeAdmin, { ...activeAdmin, id: 'another' }] }],
  ['disabled competing grant', { candidates: [activeAdmin, { ...activeAdmin, id: 'another', grant_status: 'DISABLED' }] }],
  ['disabled competing user', { candidates: [activeAdmin, { ...activeAdmin, id: 'another', user_status: 'DISABLED' }] }],
  ['sole disabled user', { candidates: [{ ...activeAdmin, user_status: 'DISABLED' }] }],
  ['sole disabled grant', { candidates: [{ ...activeAdmin, grant_status: 'DISABLED' }] }],
  ['inactive company', { company: { id: 'company', status: 'INACTIVE', main_admin_user_id: null } }],
  ['missing company', { company: null }],
]) {
  test('legacy reconciliation leaves ownership unset for ' + name, async () => {
    const state = fixture(options);
    assert.equal(await reconcileCompanyMainAdmin({ companyId: 'company' }, state.conn), null);
    assert.equal(state.writes.length, 0);
  });
}

test('both owner paths preserve an existing owner without consulting competing candidates', async () => {
  for (const initialize of [false, true]) {
    const state = fixture({ company: { id: 'company', status: 'ACTIVE', main_admin_user_id: 'established-owner' } });
    const result = initialize
      ? await initializeCompanyMainAdmin({ companyId: 'company', userId: 'original-admin' }, state.conn)
      : await reconcileCompanyMainAdmin({ companyId: 'company' }, state.conn);
    assert.equal(result, 'established-owner');
    assert.equal(state.writes.length, 0);
    assert.deepEqual(state.reads, ['company']);
  }
});

test('standalone legacy reconciliation owns its transaction and rolls back failed persistence', async (t) => {
  const state = fixture();
  const events = [];
  t.mock.method(pool, 'getConnection', async () => ({
    query: async (sql, values) => {
      if (sql.startsWith('UPDATE')) throw new Error('synthetic ownership write failure');
      return state.conn.query(sql, values);
    },
    beginTransaction: async () => events.push('begin'), commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'), release: () => events.push('release'),
  }));
  await assert.rejects(reconcileCompanyMainAdmin({ companyId: 'company' }), /synthetic ownership write failure/);
  assert.deepEqual(events, ['begin', 'rollback', 'release']);
});
