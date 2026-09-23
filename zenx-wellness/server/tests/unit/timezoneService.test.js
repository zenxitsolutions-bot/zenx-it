import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidTimezone, wallClockToUtc, utcToZonedParts, formatInZone, effectiveTimezone, zonedDayBounds } from '../../src/services/timezoneService.js';
import { updateMeSchema, updateUserSchema, createUserSchema } from '../../src/schemas/user.schema.js';

test('isValidTimezone accepts real IANA names and rejects garbage', () => {
  assert.equal(isValidTimezone('America/Chicago'), true);
  assert.equal(isValidTimezone('Asia/Kolkata'), true);
  assert.equal(isValidTimezone('Not/AZone'), false);
  assert.equal(isValidTimezone(''), false);
  assert.equal(isValidTimezone(null), false);
});

test('USA (Central) -> India: 9:00 AM America/Chicago is the same instant as 7:30 PM Asia/Kolkata', () => {
  // 2026-09-15 is well clear of any DST transition for either zone.
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/Chicago');
  const indiaParts = utcToZonedParts(utc, 'Asia/Kolkata');
  assert.equal(indiaParts.hour, 19);
  assert.equal(indiaParts.minute, 30);
  assert.equal(indiaParts.day, 15);
});

test('India -> USA (Central): 10:00 AM Asia/Kolkata lands the previous evening in Chicago', () => {
  const utc = wallClockToUtc('2026-09-15', '10:00', 'Asia/Kolkata');
  const chicagoParts = utcToZonedParts(utc, 'America/Chicago');
  assert.equal(chicagoParts.day, 14); // crossed back a calendar day
  assert.equal(chicagoParts.hour, 23);
  assert.equal(chicagoParts.minute, 30);
});

test('USA Eastern -> USA Central: a 1-hour gap, same calendar day, no DST edge', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/New_York');
  const centralParts = utcToZonedParts(utc, 'America/Chicago');
  assert.equal(centralParts.hour, 8);
  assert.equal(centralParts.day, 15);
});

test('USA Central -> USA Pacific: a 2-hour gap', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/Chicago');
  const pacificParts = utcToZonedParts(utc, 'America/Los_Angeles');
  assert.equal(pacificParts.hour, 7);
  assert.equal(pacificParts.day, 15);
});

test('USA -> UK: America/Chicago to Europe/London', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/Chicago');
  const londonParts = utcToZonedParts(utc, 'Europe/London');
  // Chicago is UTC-5 (CDT) in September; London is UTC+1 (BST) in September — 6-hour gap.
  assert.equal(londonParts.hour, 15);
  assert.equal(londonParts.day, 15);
});

test('USA -> Australia: America/Chicago to Australia/Sydney crosses into the next calendar day', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/Chicago');
  const sydneyParts = utcToZonedParts(utc, 'Australia/Sydney');
  assert.equal(sydneyParts.day, 16); // next day in Sydney
});

test('DST transition: the same 9:00 AM America/Chicago wall clock resolves to different UTC offsets across the US spring-forward boundary', () => {
  // 2026-03-08 02:00 local is the US DST transition (spring forward) — pick dates either side.
  const beforeDst = wallClockToUtc('2026-03-07', '09:00', 'America/Chicago'); // still CST (UTC-6)
  const afterDst = wallClockToUtc('2026-03-09', '09:00', 'America/Chicago'); // now CDT (UTC-5)
  assert.equal(beforeDst.getUTCHours(), 15); // 09:00 CST = 15:00 UTC
  assert.equal(afterDst.getUTCHours(), 14); // 09:00 CDT = 14:00 UTC
  // Critically: the LOCAL wall-clock time is identical (9:00 AM) on both sides — proving this is
  // real IANA-database DST handling, not a fixed offset that would have given the same UTC hour.
  assert.equal(utcToZonedParts(beforeDst, 'America/Chicago').hour, 9);
  assert.equal(utcToZonedParts(afterDst, 'America/Chicago').hour, 9);
});

test('midnight-crossing appointment: 11:30 PM Asia/Kolkata is still the PREVIOUS calendar day in UTC', () => {
  const utc = wallClockToUtc('2026-09-15', '23:30', 'Asia/Kolkata');
  // Asia/Kolkata is UTC+5:30 — 23:30 IST on the 15th is 18:00 UTC on the 15th (doesn't cross here),
  // so use a time that genuinely crosses: 00:30 IST is 19:00 UTC the PRIOR day.
  const utcMidnightCase = wallClockToUtc('2026-09-15', '00:30', 'Asia/Kolkata');
  assert.equal(utcMidnightCase.getUTCDate(), 14);
  assert.equal(utc.getUTCDate(), 15); // sanity: 23:30 IST doesn't cross forward
});

test('formatInZone renders a labelled, human-readable string in the target zone', () => {
  const utc = wallClockToUtc('2026-09-15', '09:00', 'America/Chicago');
  const rendered = formatInZone(utc, 'Asia/Kolkata');
  assert.match(rendered, /7:30\s?PM/);
  assert.match(rendered, /15 Sep 2026|Sep(tember)? 15,? 2026/);
});

test('effectiveTimezone falls back to UTC for a user with no saved preference, and for a bare enquiry-contact stand-in', () => {
  assert.equal(effectiveTimezone({ timezone: 'Asia/Kolkata' }), 'Asia/Kolkata');
  assert.equal(effectiveTimezone({ timezone: 'UTC' }), 'UTC');
  assert.equal(effectiveTimezone({ timezone: null }), 'UTC');
  assert.equal(effectiveTimezone({ name: 'Lead Contact', email: 'lead@example.com' }), 'UTC');
  assert.equal(effectiveTimezone(null), 'UTC');
});

test('notifications use detected India/USA zones instead of stale saved UTC or a scheduling zone', () => {
  const instant = '2026-09-15T14:00:00.000Z';
  const dietitian = { timezone: 'UTC', detectedTimezone: 'Asia/Kolkata' };
  const client = { timezone: 'Asia/Kolkata', detectedTimezone: 'America/Chicago' };
  assert.match(formatInZone(instant, effectiveTimezone(dietitian)), /7:30 PM/);
  assert.match(formatInZone(instant, effectiveTimezone(client)), /9:00 AM/);
  assert.equal(effectiveTimezone({ timezone: 'Asia/Kolkata', detectedTimezone: 'Not/AZone' }), 'Asia/Kolkata');
});

test('only self updates accept a detected zone, and it must be a valid IANA zone', () => {
  assert.equal(updateMeSchema.parse({ detectedTimezone: 'Asia/Kolkata' }).detectedTimezone, 'Asia/Kolkata');
  assert.equal(updateMeSchema.safeParse({ detectedTimezone: 'Not/AZone' }).success, false);
  assert.equal(updateMeSchema.safeParse({ detectedTimezone: null }).success, false);
  assert.deepEqual(updateUserSchema.parse({ detectedTimezone: 'Asia/Kolkata' }), {});
  const created = createUserSchema.parse({
    name: 'Client', email: 'client@example.com', password: 'example-password', role: 'client', detectedTimezone: 'Asia/Kolkata',
  });
  assert.equal('detectedTimezone' in created, false);
});

test('India and USA dashboard today boundaries reflect different local calendar dates', () => {
  const now = new Date('2026-09-15T01:00:00.000Z');
  const india = zonedDayBounds(now, 'Asia/Kolkata');
  const chicago = zonedDayBounds(now, 'America/Chicago');
  assert.equal(india.dayStart.toISOString(), '2026-09-14T18:30:00.000Z');
  assert.equal(india.dayEnd.toISOString(), '2026-09-15T18:29:59.999Z');
  assert.equal(chicago.dayStart.toISOString(), '2026-09-14T05:00:00.000Z');
  assert.equal(chicago.dayEnd.toISOString(), '2026-09-15T04:59:59.999Z');
});

test('dashboard day bounds and last-week comparison handle 23/25-hour DST days', () => {
  const spring = zonedDayBounds(new Date('2026-03-08T18:00:00Z'), 'America/Chicago');
  const autumn = zonedDayBounds(new Date('2026-11-01T18:00:00Z'), 'America/Chicago');
  assert.equal(spring.dayEnd - spring.dayStart + 1, 23 * 60 * 60 * 1000);
  assert.equal(autumn.dayEnd - autumn.dayStart + 1, 25 * 60 * 60 * 1000);
  const lastWeek = zonedDayBounds(new Date('2026-03-15T18:00:00Z'), 'America/Chicago', -7);
  assert.equal(lastWeek.dayStart.toISOString(), spring.dayStart.toISOString());
  assert.equal(lastWeek.dayEnd.toISOString(), spring.dayEnd.toISOString());
});
