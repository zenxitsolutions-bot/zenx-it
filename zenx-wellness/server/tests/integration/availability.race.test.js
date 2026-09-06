// Integration test — needs a real, reachable MySQL matching server/.env's MYSQL_URL (same
// requirement `npm run dev` already has; run `npm run db:migrate` once first so the
// dietitian_weekly_hours / dietitian_availability_exceptions tables exist). Run via `npm test`
// (server/tests/unit/*.test.js need no DB and pass on their own via `npm run test:unit`).
//
// Proves the concurrent-booking race is actually closed at the SQL level (see the module comment
// in server/src/services/availabilityGuard.js): two transactions racing to book the identical slot
// for the same dietitian must not both succeed.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool, withTransaction } from '../../src/db/pool.js';
import { newId } from '../../src/db/id.js';
import { createCall } from '../../src/models/Call.js';
import { assertSlotAvailable } from '../../src/services/availabilityGuard.js';
import { ApiError } from '../../src/utils/ApiError.js';

let dietitianId;
let clientId;
// Any string works — no real FK to admin-server's companies table (cross-service id, see the
// company_id comment in schema.sql). Fixed per-run so both rows are unambiguously same-company.
const companyId = newId();

before(async () => {
  dietitianId = newId();
  clientId = newId();
  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, role, company_id) VALUES (?, 'Race Test Dietitian', ?, 'x', 'dietitian', ?)",
    [dietitianId, `race-dietitian-${dietitianId}@test.local`, companyId]
  );
  await pool.query(
    "INSERT INTO users (id, name, email, password_hash, role, company_id) VALUES (?, 'Race Test Client', ?, 'x', 'client', ?)",
    [clientId, `race-client-${clientId}@test.local`, companyId]
  );
});

after(async () => {
  // Cascades: users -> calls (fk_calls_dietitian/client ON DELETE CASCADE) and any
  // weekly-hours/exceptions rows this test happened to create.
  await pool.query('DELETE FROM users WHERE id IN (?, ?)', [dietitianId, clientId]);
  await pool.end();
});

async function attemptBooking(scheduledAt) {
  return withTransaction(async (conn) => {
    await assertSlotAvailable({ dietitianId, scheduledAt }, conn);
    return createCall({ client: clientId, dietitian: dietitianId, scheduledAt }, conn);
  });
}

test('two concurrent bookings of the identical slot: exactly one succeeds, the other gets a 409', async () => {
  // Dietitian has no weekly_hours rows configured, so this only exercises the overlap/race path
  // (see the "no template configured = unrestricted" case already covered in the unit tests).
  const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // a week out, arbitrary

  const results = await Promise.allSettled([attemptBooking(scheduledAt), attemptBooking(scheduledAt)]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');
  assert.equal(fulfilled.length, 1, 'exactly one booking attempt should succeed');
  assert.equal(rejected.length, 1, 'exactly one booking attempt should be rejected');
  assert.ok(rejected[0].reason instanceof ApiError);
  assert.equal(rejected[0].reason.status, 409);

  const [rows] = await pool.query(
    'SELECT id FROM calls WHERE dietitian_id = ? AND scheduled_at = ?',
    [dietitianId, scheduledAt]
  );
  assert.equal(rows.length, 1, 'only one call row should have actually been inserted');
});

test('back-to-back concurrent bookings (adjacent slots) can both succeed', async () => {
  const first = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
  const second = new Date(first.getTime() + 30 * 60_000); // exactly 30 min later — back-to-back

  const results = await Promise.allSettled([attemptBooking(first), attemptBooking(second)]);
  assert.ok(results.every((r) => r.status === 'fulfilled'), 'adjacent, non-overlapping slots should both book');
});
