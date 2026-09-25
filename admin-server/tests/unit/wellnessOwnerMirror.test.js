import test from 'node:test';
import assert from 'node:assert/strict';
import { provisionWellnessUser, syncWellnessMainAdmin, updateWellnessPassword } from '../../src/models/WellnessDb.js';
import { comparePassword } from '../../src/utils/password.js';

const input = {
  zenxUserId: 'zenx-owner', mainAdminUserId: 'zenx-owner', zenxRole: 'wellness_admin',
  companyId: 'company-a', companyName: 'Company A', companySlug: 'company-a', companyStatus: 'ACTIVE',
  name: 'Original Owner', email: 'owner@example.test', temporaryPassword: 'Synthetic-Owner-Test-123!',
};
const company = { id: input.companyId, slug: input.companySlug, status: 'ACTIVE' };
const user = {
  id: 'local-owner', company_id: input.companyId, zenx_user_id: input.zenxUserId,
  email: input.email, role: 'admin', account_status: 'active', password_hash: 'old-hash',
};

// A transaction serializes the mock company lock and restores all writes on rollback. No
// connection to either configured database is used by these model-level integration tests.
function fixture({ companies = [company], users = [], owner = null, failAudit = false } = {}) {
  let state = structuredClone({ companies, users, owner, audits: [], retired: [] });
  const calls = [];
  const counts = { commits: 0, rollbacks: 0, releases: 0 };
  let tail = Promise.resolve();
  const database = { async getConnection() {
    let unlock;
    let snapshot;
    return {
      async beginTransaction() {
        const previous = tail;
        tail = new Promise((resolve) => { unlock = resolve; });
        await previous;
        snapshot = structuredClone(state);
      },
      async commit() { counts.commits += 1; unlock(); },
      async rollback() { counts.rollbacks += 1; state = snapshot; unlock(); },
      release() { counts.releases += 1; },
      async query(sql, values = []) {
        calls.push({ sql, values });
        if (sql.startsWith('SELECT id, status FROM companies')) {
          const key = sql.includes('WHERE slug') ? 'slug' : 'id';
          return [state.companies.filter((row) => row[key] === values[0]).map((row) => ({ ...row }))];
        }
        if (sql.startsWith('UPDATE companies SET name')) {
          const row = state.companies.find((entry) => entry.id === values.at(-1));
          if (sql.includes('status = ?')) row.status = values.at(-2);
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('INSERT INTO companies')) {
          state.companies.push({ id: values[0], slug: values[2], status: values[5] });
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('SELECT main_admin_user_id')) return [state.owner ? [{ main_admin_user_id: state.owner }] : []];
        if (sql.startsWith('SELECT') && sql.includes('FROM users')) {
          assert.match(sql, /FOR UPDATE$/);
          let rows;
          if (sql.includes('OR LOWER(email)')) rows = state.users.filter((row) => row.zenx_user_id === values[0] || row.email.toLowerCase() === values[1]);
          else if (sql.includes('WHERE LOWER(email)')) rows = state.users.filter((row) => row.email.toLowerCase() === values[0]
            && row.company_id === values[1] && (!row.zenx_user_id || row.zenx_user_id === values[2]));
          else rows = state.users.filter((row) => row.zenx_user_id === values[0] && (values.length === 1 || row.company_id === values[1]));
          return [rows.map((row) => ({ ...row }))];
        }
        if (sql.startsWith('INSERT INTO users')) {
          const [id, name, email, password_hash, role, zenx_user_id, company_id, company_slug] = values;
          state.users.push({ id, name, email, password_hash, role, zenx_user_id, company_id, company_slug, account_status: 'active', must_change_password: true });
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE users SET zenx_user_id')) {
          const row = state.users.find((entry) => entry.id === values[1] && entry.company_id === values[2] && !entry.zenx_user_id);
          if (!row) return [{ affectedRows: 0 }];
          row.zenx_user_id = values[0];
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE password_reset_tokens')) { state.retired.push(values[0]); return [{ affectedRows: 1 }]; }
        if (sql.startsWith('UPDATE users SET password_hash')) {
          const row = state.users.find((entry) => entry.id === values[2]);
          row.password_hash = values[0];
          row.must_change_password = values[1];
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('INSERT INTO company_access_control')) {
          assert.equal(state.owner, null, 'ownership must never be overwritten');
          state.owner = values[1];
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('INSERT INTO permission_audit')) {
          if (failAudit) throw new Error('Simulated audit storage failure');
          state.audits.push(values);
          return [{ affectedRows: 1 }];
        }
        throw new Error('Unexpected mocked query: ' + sql);
      },
    };
  } };
  return { database, calls, counts, get state() { return state; } };
}

test('new ZenX company owner receives direct-login credentials and full-access ownership atomically', async () => {
  const f = fixture({ companies: [] });
  const id = await provisionWellnessUser(input, f.database);
  assert.equal(f.state.owner, id);
  assert.equal(f.state.audits.length, 1);
  assert.equal(f.state.audits[0][3], 'main_admin_initialized');
  assert.equal(f.state.users[0].must_change_password, true);
  assert.equal(await comparePassword(input.temporaryPassword, f.state.users[0].password_hash), true);
  assert.deepEqual(f.counts, { commits: 1, rollbacks: 0, releases: 1 });
  const accessLock = f.calls.findIndex(({ sql }) => sql.startsWith('SELECT main_admin_user_id'));
  const userLock = f.calls.findIndex(({ sql }) => sql.includes('FROM users'));
  assert.ok(accessLock < userLock);
});

test('concurrent reconciliation elects the same trusted owner only once without changing credentials', async () => {
  const f = fixture({ users: [user] });
  const ids = await Promise.all([syncWellnessMainAdmin(input, f.database), syncWellnessMainAdmin(input, f.database)]);
  assert.deepEqual(ids, [user.id, user.id]);
  assert.equal(f.state.owner, user.id);
  assert.equal(f.state.audits.length, 1);
  assert.equal(f.state.users[0].password_hash, user.password_hash);
});

test('existing explicitly configured owner survives new proof for a different owner', async () => {
  const f = fixture({ users: [user], owner: 'existing-operator-owner' });
  await syncWellnessMainAdmin(input, f.database);
  assert.equal(f.state.owner, 'existing-operator-owner');
  assert.equal(f.state.audits.length, 0);
});

test('owner proof cannot promote ordinary grants, inactive accounts/companies, or non-admin local roles', async () => {
  const cases = [
    { input: { mainAdminUserId: undefined } },
    { input: { mainAdminUserId: 'another-person' } },
    { input: { zenxRole: 'dietitian' } },
    { input: { companyStatus: 'INACTIVE' } },
    { user: { account_status: 'inactive' } },
    { user: { account_status: 'suspended' } },
    { user: { role: 'dietitian' } },
    { company: { status: 'INACTIVE' } },
    { user: { company_id: 'other-company' } },
  ];
  for (const scenario of cases) {
    const f = fixture({ users: [{ ...user, ...scenario.user }], companies: [{ ...company, ...scenario.company }] });
    await syncWellnessMainAdmin({ ...input, ...scenario.input }, f.database);
    assert.equal(f.state.owner, null, JSON.stringify(scenario));
    assert.equal(f.state.audits.length, 0);
  }
});

test('same-email accounts in other companies or already linked to another identity keep their credentials', async () => {
  for (const patch of [{ company_id: 'other-company' }, { company_id: 'other-company', zenx_user_id: null }, { zenx_user_id: 'another-identity' }]) {
    const existing = { ...user, ...patch };
    const f = fixture({ users: [existing] });
    await assert.rejects(provisionWellnessUser(input, f.database), { code: 'ERR_WELLNESS_IDENTITY_CONFLICT' });
    assert.deepEqual(f.state.users, [existing]);
    assert.equal(f.state.owner, null);
    assert.equal(f.state.retired.length, 0);
    assert.equal(f.counts.rollbacks, 1);
  }
});

test('concurrent same-email provisioning cannot replace the first established ZenX identity', async () => {
  const f = fixture();
  const competingInput = { ...input, zenxUserId: 'competing-identity', mainAdminUserId: 'competing-identity' };
  const results = await Promise.allSettled([provisionWellnessUser(input, f.database), provisionWellnessUser(competingInput, f.database)]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.code === 'ERR_WELLNESS_IDENTITY_CONFLICT').length, 1);
  assert.equal(f.state.users.length, 1);
  assert.equal(f.state.owner, f.state.users[0].id);
  assert.equal(f.state.audits.length, 1);
});

test('unlinked same-company admin can be linked to the trusted original owner without changing role', async () => {
  const f = fixture({ users: [{ ...user, zenx_user_id: null }] });
  assert.equal(await provisionWellnessUser(input, f.database), user.id);
  assert.equal(f.state.users[0].zenx_user_id, input.zenxUserId);
  assert.equal(f.state.users[0].role, 'admin');
  assert.equal(f.state.owner, user.id);
});

test('eager provisioning rejects an unlinked same-email account with a different local role', async () => {
  for (const role of ['client', 'dietitian']) {
    const existing = { ...user, zenx_user_id: null, role };
    const f = fixture({ users: [existing] });
    await assert.rejects(provisionWellnessUser(input, f.database), { code: 'ERR_WELLNESS_IDENTITY_CONFLICT' });
    assert.deepEqual(f.state.users, [existing]);
    assert.equal(f.state.retired.length, 0);
    assert.equal(f.state.owner, null);
  }
});

test('reused company slug never establishes ownership or authorizes relinking an old email', async () => {
  const historicalCompany = { ...company, id: 'historical-company' };
  const f = fixture({ companies: [historicalCompany] });
  await provisionWellnessUser(input, f.database);
  assert.equal(f.state.owner, null);
  assert.equal(f.state.audits.length, 0);
  assert.equal(await syncWellnessMainAdmin(input, f.database), null);
  const collision = fixture({ companies: [historicalCompany], users: [{ ...user, company_id: historicalCompany.id, zenx_user_id: null }] });
  await assert.rejects(provisionWellnessUser(input, collision.database), { code: 'ERR_WELLNESS_IDENTITY_CONFLICT' });
  assert.equal(collision.state.users[0].password_hash, user.password_hash);
});

test('inactive source provisioning mirrors inactive status without assigning ownership', async () => {
  const f = fixture({ companies: [] });
  await provisionWellnessUser({ ...input, companyStatus: 'INACTIVE' }, f.database);
  assert.equal(f.state.companies[0].status, 'INACTIVE');
  assert.equal(f.state.owner, null);
});

test('eager provisioning preserves an existing local suspension or company deactivation', async () => {
  for (const scenario of [{ user: { account_status: 'suspended' } }, { company: { status: 'INACTIVE' } }]) {
    const f = fixture({ users: [{ ...user, ...scenario.user }], companies: [{ ...company, ...scenario.company }] });
    await provisionWellnessUser(input, f.database);
    assert.equal(f.state.owner, null);
    assert.equal(f.state.users[0].account_status, scenario.user?.account_status ?? 'active');
    assert.equal(f.state.companies[0].status, scenario.company?.status ?? 'ACTIVE');
  }
});

test('audit failure rolls back new identity, credentials and owner together', async () => {
  const f = fixture({ companies: [], failAudit: true });
  await assert.rejects(provisionWellnessUser(input, f.database), /Simulated audit storage failure/);
  assert.deepEqual(f.state.companies, []);
  assert.deepEqual(f.state.users, []);
  assert.equal(f.state.owner, null);
  assert.deepEqual(f.counts, { commits: 0, rollbacks: 1, releases: 1 });
});

const credentialInput = { zenxUserId: input.zenxUserId, email: input.email, passwordHash: 'new-hash', mustChangePassword: false };

test('password synchronization without company context requires a stable linked ZenX identity', async () => {
  const collision = fixture({ users: [{ ...user, zenx_user_id: null }] });
  assert.equal(await updateWellnessPassword(credentialInput, collision.database), null);
  assert.equal(collision.state.users[0].password_hash, user.password_hash);
  assert.equal(collision.calls.some(({ sql }) => sql.includes('LOWER(email)')), false);
  const linked = fixture({ users: [user] });
  assert.equal(await updateWellnessPassword(credentialInput, linked.database), user.id);
  assert.equal(linked.state.users[0].password_hash, 'new-hash');
});

test('scoped credential sync never links or overwrites an email-only account', async () => {
  for (const patch of [{ zenx_user_id: null }, { company_id: 'other-company', zenx_user_id: null }, { zenx_user_id: 'another-identity' }]) {
    const f = fixture({ users: [{ ...user, ...patch }] });
    assert.equal(await updateWellnessPassword({ ...credentialInput, companyId: input.companyId }, f.database), null);
    assert.equal(f.state.users[0].password_hash, user.password_hash);
    assert.equal(f.state.users[0].zenx_user_id, patch.zenx_user_id);
    assert.equal(f.calls.some(({ sql }) => sql.includes('LOWER(email)') || sql.startsWith('UPDATE users')), false);
  }
});

test('scoped credential sync still updates the exact linked account and retires old reset links', async () => {
  const f = fixture({ users: [user] });
  assert.equal(await updateWellnessPassword({ ...credentialInput, companyId: input.companyId }, f.database), user.id);
  assert.equal(f.state.users[0].zenx_user_id, input.zenxUserId);
  assert.equal(f.state.users[0].password_hash, 'new-hash');
  assert.deepEqual(f.state.retired, [user.id]);
});

test('password sync cannot use a recreated company slug to overwrite historical credentials', async () => {
  const f = fixture({ companies: [{ ...company, id: 'historical-company' }], users: [{ ...user, company_id: 'historical-company' }] });
  assert.equal(await updateWellnessPassword({ ...credentialInput, companyId: input.companyId, companySlug: input.companySlug }, f.database), null);
  assert.equal(f.state.users[0].password_hash, user.password_hash);
});
