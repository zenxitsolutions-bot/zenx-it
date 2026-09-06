import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toZonedTime } from 'date-fns-tz';
import { computeOccurrencesInWindow } from '../../src/services/consultationScheduleService.js';

// Locks in the DST-safety this generator already had (services/consultationScheduleService.js's
// own module comment: each occurrence is re-resolved to a fresh UTC instant via fromZonedTime,
// never `prevInstant + frequencyDays * 24h`) — this test existed nowhere before; it did not exist
// as a regression guard until now.
test('recurring appointment stays at 9:00 AM America/Chicago across the US spring-forward DST transition', () => {
  // 2026-03-08 02:00 local is the US DST transition. Anchor a Sunday-weekly series starting just
  // before it so occurrences are generated on both sides.
  const occurrences = computeOccurrencesInWindow({
    startDate: '2026-03-01', // a Sunday
    preferredWeekday: 0, // Sunday
    preferredTime: '09:00',
    frequencyDays: 7,
    timezone: 'America/Chicago',
    windowDays: 28,
    now: new Date('2026-03-01T00:00:00Z'),
  });

  // Expect occurrences on 2026-03-01, 03-08, 03-15, 03-22 (03-29 falls just outside the 28-day window).
  assert.equal(occurrences.length, 4);

  for (const instant of occurrences) {
    const zoned = toZonedTime(instant, 'America/Chicago');
    assert.equal(zoned.getHours(), 9, `expected 9 AM local for ${instant.toISOString()}, got ${zoned.getHours()}`);
    assert.equal(zoned.getMinutes(), 0);
  }

  // The UTC hour must actually differ either side of the transition — proving the local time was
  // held constant by re-resolving against the IANA database each occurrence, not by reusing a fixed
  // offset (which would have kept the UTC hour identical throughout instead).
  const beforeDstUtcHour = occurrences[0].getUTCHours(); // 2026-03-01, still CST (UTC-6)
  const afterDstUtcHour = occurrences[occurrences.length - 1].getUTCHours(); // 2026-03-22, now CDT (UTC-5)
  assert.notEqual(beforeDstUtcHour, afterDstUtcHour);
  assert.equal(beforeDstUtcHour, 15); // 09:00 CST = 15:00 UTC
  assert.equal(afterDstUtcHour, 14); // 09:00 CDT = 14:00 UTC
});

test('a non-week-multiple frequency drifts across weekdays by design (documented, not a bug)', () => {
  const occurrences = computeOccurrencesInWindow({
    startDate: '2026-03-01', // a Sunday
    preferredWeekday: 0,
    preferredTime: '09:00',
    frequencyDays: 10, // not a multiple of 7
    timezone: 'UTC',
    windowDays: 40,
    now: new Date('2026-03-01T00:00:00Z'),
  });

  const weekdays = occurrences.map((d) => d.getUTCDay());
  // First occurrence anchors to Sunday (0); subsequent ones are +10 days and are NOT re-snapped.
  assert.equal(weekdays[0], 0);
  assert.notEqual(weekdays[1], 0); // 10 days later is a Wednesday, not a Sunday
});
