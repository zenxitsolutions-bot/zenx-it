import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidTimezone, wallClockToUtc, utcToZonedParts, formatInZone, effectiveTimezone } from '../../src/services/timezoneService.js';

// Same 10-scenario matrix as wellness-app's own tests/unit/timezoneService.test.js — independent
// implementation, not shared code (see WellnessDb.js's mirror-not-share convention), so both are
// verified separately rather than assuming parity.

test('isValidTimezone accepts real IANA names and rejects garbage', () => {
  assert.equal(isValidTimezone('America/Chicago'), true);
  assert.equal(isValidTimezone('Asia/Kolkata'), true);
  assert.equal(isValidTimezone('Not/AZone'), false);
  assert.equal(isValidTimezone(''), false);
  assert.equal(isValidTimezone(null), false);
});

test('USA (Central) -> India: 9:00 AM America/Chicago is the same instant as 7:30 PM Asia/Kolkata', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/Chicago');
  const indiaParts = utcToZonedParts(utc, 'Asia/Kolkata');
  assert.equal(indiaParts.hour, 19);
  assert.equal(indiaParts.minute, 30);
  assert.equal(indiaParts.day, 15);
});

test('India -> USA (Central): 10:00 AM Asia/Kolkata lands the previous evening in Chicago', () => {
  const utc = wallClockToUtc('2026-09-15', '10:00', 'Asia/Kolkata');
  const chicagoParts = utcToZonedParts(utc, 'America/Chicago');
  assert.equal(chicagoParts.day, 14);
  assert.equal(chicagoParts.hour, 23);
  assert.equal(chicagoParts.minute, 30);
});

test('USA Eastern -> USA Central: a 1-hour gap', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/New_York');
  const centralParts = utcToZonedParts(utc, 'America/Chicago');
  assert.equal(centralParts.hour, 8);
});

test('USA Central -> USA Pacific: a 2-hour gap', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/Chicago');
  const pacificParts = utcToZonedParts(utc, 'America/Los_Angeles');
  assert.equal(pacificParts.hour, 7);
});

test('USA -> UK: America/Chicago to Europe/London', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/Chicago');
  const londonParts = utcToZonedParts(utc, 'Europe/London');
  assert.equal(londonParts.hour, 15);
});

test('USA -> Australia: crosses into the next calendar day', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/Chicago');
  const sydneyParts = utcToZonedParts(utc, 'Australia/Sydney');
  assert.equal(sydneyParts.day, 16);
});

test('DST transition: 9:00 AM America/Chicago resolves to different UTC offsets across spring-forward', () => {
  const beforeDst = wallClockToUtc('2026-03-07', '09:00', 'America/Chicago');
  const afterDst = wallClockToUtc('2026-03-09', '09:00', 'America/Chicago');
  assert.equal(beforeDst.getUTCHours(), 15);
  assert.equal(afterDst.getUTCHours(), 14);
  assert.equal(utcToZonedParts(beforeDst, 'America/Chicago').hour, 9);
  assert.equal(utcToZonedParts(afterDst, 'America/Chicago').hour, 9);
});

test('midnight-crossing: 00:30 Asia/Kolkata is the previous calendar day in UTC', () => {
  const utc = wallClockToUtc('2026-09-15', '00:30', 'Asia/Kolkata');
  assert.equal(utc.getUTCDate(), 14);
});

test('formatInZone renders a labelled, human-readable string in the target zone', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/Chicago');
  const rendered = formatInZone(utc, 'Asia/Kolkata');
  assert.match(rendered, /7:30\s?PM/);
});

test('effectiveTimezone falls back to UTC for a row with no timezone (companies.timezone can be genuinely null)', () => {
  assert.equal(effectiveTimezone({ timezone: 'Asia/Kolkata' }), 'Asia/Kolkata');
  assert.equal(effectiveTimezone({ timezone: null }), 'UTC');
  assert.equal(effectiveTimezone(null), 'UTC');
});
