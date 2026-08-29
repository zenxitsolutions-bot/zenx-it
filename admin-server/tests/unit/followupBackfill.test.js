import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wallClockToUtc } from '../../src/services/timezoneService.js';

// migrate.js's backfill runs, at the SQL level:
//   UPDATE followups SET scheduled_at_utc = TIMESTAMP(scheduled_date, scheduled_time), timezone = 'UTC'
// MySQL's TIMESTAMP(date, time) is a pure string concatenation into a DATETIME — it performs no
// timezone conversion of its own. This test locks in that assumption at the application level: our
// own wallClockToUtc('2026-03-15', '09:00:00', 'UTC') — the "reinterpret these digits as UTC, zero
// shift" operation the backfill relies on being equivalent to — must produce the exact same
// calendar digits back out, proving the backfill introduces no numeric shift for any pre-existing
// row. No DB connection needed (this repo has no integration test infra) — this is the pure-function
// half of that guarantee.
test('backfill is zero-numeric-shift: reinterpreting existing wall-clock digits as UTC changes nothing', () => {
  const cases = [
    ['2026-03-15', '09:00:00'],
    ['2026-01-01', '00:00:00'],
    ['2026-12-31', '23:59:00'],
    ['2026-08-28', '21:14:00'],
  ];
  for (const [date, time] of cases) {
    const utc = wallClockToUtc(date, time, 'UTC');
    const [y, m, d] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    assert.equal(utc.getUTCFullYear(), y, `${date} ${time}: year`);
    assert.equal(utc.getUTCMonth() + 1, m, `${date} ${time}: month`);
    assert.equal(utc.getUTCDate(), d, `${date} ${time}: day`);
    assert.equal(utc.getUTCHours(), h, `${date} ${time}: hour`);
    assert.equal(utc.getUTCMinutes(), min, `${date} ${time}: minute`);
  }
});

test('a NEW followup, by contrast, is genuinely converted (not just relabelled) when its zone is not UTC', () => {
  const utc = wallClockToUtc('2026-03-15', '09:00:00', 'America/Chicago');
  // 09:00 CDT (March, already past spring-forward) = 14:00 UTC — a real 5-hour shift, unlike the
  // backfill's zero-shift 'UTC' placeholder.
  assert.equal(utc.getUTCHours(), 14);
  assert.notEqual(utc.getUTCHours(), 9);
});
