// Read-only login triage. Answers the one question the API deliberately will not:
// does this account exist, and does a given password actually match its stored hash?
//
// Login returns a flat 401 for both "no such email" and "wrong password" (auth.controller.js's
// single unauthorized path), on purpose — it must not become an account-enumeration oracle. That
// is correct for the internet and useless for an operator holding the DB credentials, hence this.
//
//   MYSQL_URL=<production url> node src/scripts/checkLogin.mjs <email> [password]
//
// Writes nothing. Safe to run against production.
import { pool } from '../db/pool.js';
import { comparePassword } from '../utils/password.js';

const [email, password] = process.argv.slice(2);

if (!email) {
  console.error('usage: node src/scripts/checkLogin.mjs <email> [password]');
  process.exit(1);
}

const [rows] = await pool.query(
  `SELECT id, name, email, role, account_status, must_change_password, company_id, company_slug, password_hash
     FROM users WHERE email = ?`,
  [email]
);

if (!rows.length) {
  console.log(`\nNOT FOUND: no users row for ${email}`);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');
  console.log(`This database holds ${total} user(s). Nearest matches by domain:`);
  const [near] = await pool.query(
    'SELECT email, role, company_slug FROM users WHERE email LIKE ? LIMIT 10',
    [`%@${email.split('@')[1] ?? ''}`]
  );
  console.table(near.length ? near : [{ email: '(none)', role: '', company_slug: '' }]);
  await pool.end();
  process.exit(0);
}

const u = rows[0];
console.log(`\nFOUND: ${u.email}`);
console.table([{
  id: u.id,
  name: u.name,
  role: u.role,
  account_status: u.account_status,
  must_change_password: Boolean(u.must_change_password),
  company_slug: u.company_slug,
  company_id: u.company_id,
}]);

if (password) {
  const ok = await comparePassword(password, u.password_hash);
  console.log(ok
    ? '\nPASSWORD MATCHES. A 401 here means the credential is fine — look at the tenant/status checks (they return 403) or the request body the client is sending.'
    : '\nPASSWORD DOES NOT MATCH. If this account was created by the ZenX SSO handoff its hash is 32 random bytes that nobody knows — it can only sign in via the handoff, or after a password reset.');
} else {
  console.log('\nNo password argument given — pass one to test it against the stored hash.');
}

await pool.end();
