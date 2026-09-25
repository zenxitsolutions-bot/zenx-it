import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { consumePasswordResetToken, resetPasswordWithToken } from '../../src/models/PasswordResetToken.js';
import { createHash } from 'node:crypto';
import { updateProfilePassword } from '../../src/models/Profile.js';
import { updateUserPassword } from '../../src/models/ZenxUser.js';
import { updateWellnessPassword } from '../../src/models/WellnessDb.js';

test('a password-reset token can only be consumed once under concurrent requests', async (t) => {
  let used = false;
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.startsWith('SELECT')) return [used ? [] : [{ id: 'reset-id', user_id: 'user-id', account_id: 'user-id' }]];
    assert.match(sql, /WHERE id = \? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP/);
    const affectedRows = used ? 0 : 1;
    used = true;
    return [{ affectedRows }];
  });
  const results = await Promise.all([consumePasswordResetToken('staff', 'raw-reset-token'), consumePasswordResetToken('staff', 'raw-reset-token')]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(await consumePasswordResetToken('staff', 'raw-reset-token'), null);
});

test('staff and customer password writes retire every older unused reset link in the correct realm', async (t) => {
  const calls = [];
  t.mock.method(pool, 'query', async (sql, params) => { calls.push({ sql, params }); return sql.startsWith('SELECT') ? [[{ id: 'user' }]] : [{ affectedRows: 1 }]; });
  await updateProfilePassword('staff-id', 'new-staff-hash');
  await updateUserPassword('customer-id', 'new-customer-hash', false);
  const invalidations = calls.filter((call) => call.sql.startsWith('UPDATE password_reset_tokens'));
  assert.equal(invalidations.length, 2);
  assert.match(invalidations[0].sql, /account_kind = 'staff'/);
  assert.deepEqual(invalidations[0].params, ['staff-id']);
  assert.match(invalidations[1].sql, /account_kind = 'customer'/);
  assert.deepEqual(invalidations[1].params, ['customer-id']);
});

test('cross-app password synchronization retires links only when credentials change', async () => {
  for (const storedHash of ['same-hash', 'different-hash']) {
    const calls = [];
    const conn = { query: async (sql, params) => {
      calls.push({ sql, params });
      return sql.startsWith('SELECT') ? [[{ id: 'wellness-id', password_hash: storedHash }]] : [{ affectedRows: 1 }];
    } };
    assert.equal(await updateWellnessPassword({ zenxUserId: 'zenx-id', passwordHash: 'same-hash', mustChangePassword: false }, conn), 'wellness-id');
    const invalidations = calls.filter((call) => call.sql.startsWith('UPDATE password_reset_tokens'));
    assert.equal(invalidations.length, storedHash === 'same-hash' ? 0 : 1);
    if (invalidations.length) assert.deepEqual(invalidations[0].params, ['wellness-id']);
  }
});

function transactionalFixture(t, fail = false) {
  const available = new Set(['token-a', 'token-b'].map((value) => createHash('sha256').update(value).digest('hex')));
  const state = { password: 'original', revoked: false, commits: 0, rollbacks: 0, releases: 0 };
  let tail = Promise.resolve();
  t.mock.method(pool, 'query', async (sql, params) => {
    assert.match(sql, /^SELECT (account_id|user_id) FROM password_reset_tokens/);
    return [available.has(params.at(-1)) ? [{ account_id: 'user', user_id: 'user' }] : []];
  });
  t.mock.method(pool, 'getConnection', async () => {
    let releaseLock;
    let snapshot;
    let locked = false;
    function unlock() { releaseLock?.(); releaseLock = null; }
    return {
      async beginTransaction() {},
      async query(sql, params) {
        if (/^SELECT id FROM (users|profiles)/.test(sql)) {
          assert.match(sql, /FOR UPDATE$/);
          const prior = tail;
          const gate = new Promise((resolve) => { releaseLock = resolve; });
          tail = prior.then(() => gate);
          await prior;
          locked = true;
          snapshot = { password: state.password, revoked: state.revoked, tokens: new Set(available) };
          return [[{ id: 'user' }]];
        }
        assert.equal(locked, true, 'account must be locked before token checks or writes');
        if (sql.startsWith('SELECT id FROM password_reset_tokens')) {
          assert.match(sql, /FOR UPDATE$/);
          return [available.has(params.at(-1)) ? [{ id: 'reset' }] : []];
        }
        if (/^UPDATE (users|profiles) SET password_hash/.test(sql)) { state.password = params[0]; return [{ affectedRows: 1 }]; }
        if (sql.startsWith('UPDATE password_reset_tokens')) { available.clear(); return [{ affectedRows: 2 }]; }
        if (sql.startsWith('UPDATE auth_sessions')) {
          if (fail) throw new Error('simulated storage failure');
          state.revoked = true;
          return [{ affectedRows: 2 }];
        }
        throw new Error('Unexpected transactional query: ' + sql);
      },
      async commit() { state.commits += 1; unlock(); },
      async rollback() {
        state.rollbacks += 1;
        if (snapshot) {
          state.password = snapshot.password;
          state.revoked = snapshot.revoked;
          available.clear();
          for (const token of snapshot.tokens) available.add(token);
        }
        unlock();
      },
      release() { state.releases += 1; unlock(); },
    };
  });
  return { state, available };
}

test('two distinct valid reset links cannot both replace the account password', async (t) => {
  const f = transactionalFixture(t);
  const results = await Promise.all([resetPasswordWithToken('staff', 'token-a', 'first-password'), resetPasswordWithToken('staff', 'token-b', 'second-password')]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(f.state.commits, 1);
  assert.equal(f.state.rollbacks, 1);
  assert.equal(f.state.releases, 2);
  assert.equal(f.state.revoked, true);
  assert.equal(f.available.size, 0);
});

test('password, reset-token retirement and session revocation roll back together on failure', async (t) => {
  const f = transactionalFixture(t, true);
  await assert.rejects(resetPasswordWithToken('staff', 'token-a', 'first-password'), /simulated storage failure/);
  assert.equal(f.state.password, 'original');
  assert.equal(f.state.revoked, false);
  assert.equal(f.available.size, 2);
  assert.equal(f.state.commits, 0);
  assert.equal(f.state.rollbacks, 1);
  assert.equal(f.state.releases, 1);
});
