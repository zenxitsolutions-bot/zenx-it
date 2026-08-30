// Black-box cross-tenant probe (`npm run probe:tenants`, needs the dev server running).
//
// Deliberately talks HTTP, not the models: the guarantee that matters is what an attacker with a
// real session and a REST client can reach, which unit tests over the model layer cannot show.
// Everything here is an attempt to cross the tenant boundary the way the spec describes — by
// editing a slug, an id, a query param or a request body — and every one of them must fail.
//
// Run `npm run seed:tenants` first.
import { TENANTS, TENANT_PASSWORD } from '../db/seedTenants.js';

const BASE = process.env.PROBE_BASE_URL || 'http://localhost:4000/api';
const [abc, xyz] = TENANTS;

let pass = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* 204s and file responses have no JSON body */
  }
  return { status: res.status, data };
}

const login = (email, companySlug) =>
  api('/auth/login', { method: 'POST', body: { email, password: TENANT_PASSWORD, ...(companySlug ? { companySlug } : {}) } });

console.log(`\n=== 1. LOGIN: each user through their own company endpoint (must ALLOW) ===`);
for (const tenant of TENANTS) {
  for (const u of tenant.users) {
    const { status } = await login(u.email, tenant.slug);
    check(`${u.email} -> /${tenant.slug}`, status === 200, `got ${status}`);
  }
}

console.log(`\n=== 2. LOGIN: each user through the OTHER company's endpoint (must DENY) ===`);
for (const [tenant, other] of [
  [abc, xyz],
  [xyz, abc],
]) {
  for (const u of tenant.users) {
    const { status, data } = await login(u.email, other.slug);
    check(`${u.email} -> /${other.slug}`, status === 403, `got ${status} ${JSON.stringify(data)}`);
  }
}

console.log(`\n=== 3. LOGIN: slug manipulation variants (must DENY) ===`);
{
  const john = abc.users[0].email;
  const cases = [
    ['unknown slug', 'no-such-company'],
    ['other tenant, different case', xyz.slug.toUpperCase()],
    ['empty-ish slug', ' '],
  ];
  for (const [label, slug] of cases) {
    const { status } = await login(john, slug);
    check(`${label} (${JSON.stringify(slug)})`, status === 403 || status === 400, `got ${status}`);
  }
  const own = await login(john, abc.slug.toUpperCase());
  check('own tenant, different case -> ALLOW', own.status === 200, `got ${own.status}`);
}

console.log(`\n=== 3b. LOGIN: the bare /login (no company in the URL) must DENY everyone ===`);
for (const tenant of TENANTS) {
  for (const u of tenant.users) {
    const { status, data } = await login(u.email, null);
    check(`${u.email} -> bare /login`, status === 403, `got ${status}`);
    check(`${u.email} is told its own company URL`, data?.details?.companyLoginPath === `/${tenant.slug}/login`, JSON.stringify(data?.details));
  }
}
{
  // The password is still checked first, so the bare-login refusal cannot be used to confirm that
  // an address exists: a wrong password gives the same 401 an unknown account would.
  const right = await login(abc.users[0].email, null);
  const bad = await api('/auth/login', { method: 'POST', body: { email: abc.users[0].email, password: 'definitely-wrong' } });
  check('bare /login with a WRONG password -> 401, not the 403', bad.status === 401, `got ${bad.status}`);
  check('bare /login with the RIGHT password -> 403', right.status === 403, `got ${right.status}`);
}

console.log(`\n=== 4. API: authenticated as ABC, try to reach XYZ data ===`);
const johnToken = (await login(abc.users[0].email, abc.slug)).data?.accessToken;
const davidToken = (await login(xyz.users[0].email, xyz.slug)).data?.accessToken;
check('got a token for both admins', Boolean(johnToken && davidToken));

if (johnToken && davidToken) {
  // Collect XYZ-owned ids using XYZ's own session, then try to reach each one as ABC.
  const xyzUsers = (await api('/users', { token: davidToken })).data ?? [];
  const abcUsers = (await api('/users', { token: johnToken })).data ?? [];
  const xyzEmails = new Set((Array.isArray(xyzUsers) ? xyzUsers : xyzUsers.users ?? []).map((u) => u.email));
  const abcList = Array.isArray(abcUsers) ? abcUsers : abcUsers.users ?? [];

  check(
    'GET /users as ABC contains no XYZ user',
    abcList.every((u) => !xyzEmails.has(u.email)),
    `leaked: ${abcList.filter((u) => xyzEmails.has(u.email)).map((u) => u.email).join(', ')}`
  );
  check('GET /users as ABC returns ABC users', abcList.some((u) => u.email === abc.users[1].email));

  const xyzList = Array.isArray(xyzUsers) ? xyzUsers : xyzUsers.users ?? [];
  const xyzClient = xyzList.find((u) => u.role === 'client');
  const xyzDietitian = xyzList.find((u) => u.role === 'dietitian');

  if (xyzClient) {
    const byId = await api(`/users/${xyzClient._id ?? xyzClient.id}`, { token: johnToken });
    check('GET /users/:id of an XYZ user as ABC', byId.status === 403 || byId.status === 404, `got ${byId.status}`);

    const patched = await api(`/users/${xyzClient._id ?? xyzClient.id}`, {
      token: johnToken,
      method: 'PATCH',
      body: { name: 'OWNED BY ABC' },
    });
    check('PATCH /users/:id of an XYZ user as ABC', patched.status === 403 || patched.status === 404, `got ${patched.status}`);

    const progress = await api(`/progress?client=${xyzClient._id ?? xyzClient.id}`, { token: johnToken });
    check('GET /progress?client=<XYZ client> as ABC', progress.status === 403 || progress.status === 404, `got ${progress.status}`);

    const notes = await api(`/client-notes?client=${xyzClient._id ?? xyzClient.id}`, { token: johnToken });
    check('GET /client-notes?client=<XYZ client> as ABC', notes.status === 403 || notes.status === 404, `got ${notes.status}`);

    const messages = await api(`/messages?withUser=${xyzClient._id ?? xyzClient.id}`, { token: johnToken });
    check(
      'GET /messages?withUser=<XYZ client> as ABC',
      messages.status === 403 || messages.status === 404 || (Array.isArray(messages.data) && messages.data.length === 0),
      `got ${messages.status} ${JSON.stringify(messages.data)?.slice(0, 120)}`
    );

    const sendMsg = await api('/messages', {
      token: johnToken,
      method: 'POST',
      body: { to: xyzClient._id ?? xyzClient.id, body: 'cross-tenant probe' },
    });
    check('POST /messages to an XYZ user as ABC', sendMsg.status >= 400, `got ${sendMsg.status}`);
  }

  if (xyzDietitian) {
    const sched = await api(`/consultation-schedules?dietitian=${xyzDietitian._id ?? xyzDietitian.id}`, { token: johnToken });
    check(
      'GET /consultation-schedules?dietitian=<XYZ> as ABC',
      sched.status >= 400 || !JSON.stringify(sched.data ?? '').includes(xyzDietitian._id ?? xyzDietitian.id),
      `got ${sched.status}`
    );
  }

  // Body-supplied company id must never widen scope.
  const forgedList = await api(`/users?companyId=${encodeURIComponent(davidToken ? 'x' : 'x')}`, { token: johnToken });
  check('GET /users?companyId=<other> ignored (no XYZ rows)', !JSON.stringify(forgedList.data ?? '').includes('xyz-wellness.test'), 'XYZ email present in response');

  // Collection endpoints must be company-scoped with no parameter at all. Each tenant holds a row
  // literally named "<slug> only" (seedTenants#seedTenantData), so this asserts BOTH directions:
  // the caller sees its own marker and does not see the other tenant's. Checking only the second
  // half would pass on an empty table and prove nothing.
  for (const path of ['/recipes', '/enquiries', '/program-plans']) {
    const asAbc = await api(path, { token: johnToken });
    const asXyz = await api(path, { token: davidToken });
    const abcText = JSON.stringify(asAbc.data ?? '');
    const xyzText = JSON.stringify(asXyz.data ?? '');
    check(`${path} as ABC sees its own marker`, abcText.includes('abc-nutrition only'), `status ${asAbc.status}`);
    check(`${path} as XYZ sees its own marker`, xyzText.includes('xyz-wellness only'), `status ${asXyz.status}`);
    check(`${path} as ABC does NOT see XYZ's marker`, !abcText.includes('xyz-wellness only'), 'LEAK');
    check(`${path} as XYZ does NOT see ABC's marker`, !xyzText.includes('abc-nutrition only'), 'LEAK');
  }

  // These have no seeded rows yet, so they can only be checked in the negative direction — noted
  // as such rather than counted as proof of scoping.
  for (const path of ['/plans', '/calls', '/reports', '/email-log']) {
    const asAbc = await api(path, { token: johnToken });
    const text = JSON.stringify(asAbc.data ?? '');
    check(`${path} as ABC contains no xyz-wellness data (weak: may be empty)`, !text.includes('xyz-wellness'), `status ${asAbc.status}`);
  }
}

console.log(`\n=== 5. Branding by slug (public, unauthenticated) ===`);
for (const tenant of TENANTS) {
  const { data } = await api(`/company/public/${tenant.slug}`);
  check(`/company/public/${tenant.slug} -> ${tenant.name}`, data?.company?.name === tenant.name, JSON.stringify(data));
  check(`/company/public/${tenant.slug} -> own logo`, Boolean(data?.company?.logoUrl), 'no logoUrl');
}
{
  const { data } = await api('/company/public/no-such-company');
  check('unknown slug returns null (no enumeration)', data?.company === null, JSON.stringify(data));
}

console.log(`\n=== 6. Company status gate (an INACTIVE company cannot be logged into) ===`);
{
  // The one check that cannot be done over HTTP alone — nothing in this API can deactivate a
  // company (ZenX admin-server owns that), so the state is set directly and restored in a finally.
  const { pool } = await import('../db/pool.js');
  try {
    await pool.query('UPDATE companies SET status = ? WHERE slug = ?', ['INACTIVE', xyz.slug]);
    const denied = await login(xyz.users[0].email, xyz.slug);
    check('own tenant but company INACTIVE -> DENY', denied.status === 403, `got ${denied.status}`);
    check('denial names the company status, not the credentials', /not active/i.test(denied.data?.error ?? ''), JSON.stringify(denied.data));

    const otherStillFine = await login(abc.users[0].email, abc.slug);
    check('the other company is unaffected', otherStillFine.status === 200, `got ${otherStillFine.status}`);
  } finally {
    await pool.query('UPDATE companies SET status = ? WHERE slug = ?', ['ACTIVE', xyz.slug]);
    const restored = await login(xyz.users[0].email, xyz.slug);
    check('status restored to ACTIVE -> ALLOW again', restored.status === 200, `got ${restored.status}`);
    await pool.end();
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nFAILURES:');
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
