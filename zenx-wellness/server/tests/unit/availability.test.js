import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toZonedTime } from 'date-fns-tz';
import { checkAvailability, listAvailableSlots, CALL_DURATION_MINUTES } from '../../src/services/availability.js';

// Monday 2026-08-24, 09:00-17:00 UTC — a plain weekday template used by most cases below.
const MON_9_5 = [{ weekday: 1, startTime: '09:00', endTime: '17:00' }];

test('CALL_DURATION_MINUTES is the fixed 30-minute slot length', () => {
  assert.equal(CALL_DURATION_MINUTES, 30);
});

test('outside working hours: a slot before the weekday template opens is rejected', () => {
  const result = checkAvailability({
    workingHours: MON_9_5,
    requestedStart: '2026-08-24T08:30:00Z', // opens at 09:00
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'outside_hours');
});

test('outside working hours: a slot that runs past close is rejected', () => {
  const result = checkAvailability({
    workingHours: MON_9_5,
    requestedStart: '2026-08-24T16:45:00Z', // ends 17:15, template closes 17:00
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'outside_hours');
});

test('outside working hours: a weekday with no template row is closed', () => {
  const result = checkAvailability({
    workingHours: MON_9_5, // no Tuesday row
    requestedStart: '2026-08-25T10:00:00Z',
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'outside_hours');
});

test('inside working hours: a slot fully within the template succeeds', () => {
  const result = checkAvailability({
    workingHours: MON_9_5,
    requestedStart: '2026-08-24T10:00:00Z',
  });
  assert.deepEqual(result, { ok: true });
});

test('no weekly template configured at all is unrestricted (backward compatible)', () => {
  const result = checkAvailability({
    workingHours: [],
    requestedStart: '2026-08-24T23:00:00Z', // would be outside any normal template
  });
  assert.deepEqual(result, { ok: true });
});

test('an open exception grants hours outside the weekly template', () => {
  const result = checkAvailability({
    workingHours: MON_9_5, // no Saturday row -> normally closed
    exceptions: [{ startAt: '2026-08-22T10:00:00Z', endAt: '2026-08-22T14:00:00Z', kind: 'open' }],
    requestedStart: '2026-08-22T11:00:00Z', // Saturday, inside the open exception
  });
  assert.deepEqual(result, { ok: true });
});

test('blocked date: a closed exception spanning the whole day rejects any slot that day', () => {
  const result = checkAvailability({
    workingHours: MON_9_5,
    exceptions: [{ startAt: '2026-08-24T00:00:00Z', endAt: '2026-08-25T00:00:00Z', kind: 'closed', note: 'Day off' }],
    requestedStart: '2026-08-24T10:00:00Z',
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'blocked');
  assert.match(result.message, /Day off/);
});

test('blocked time: a closed exception for part of the day rejects only that window', () => {
  const exceptions = [{ startAt: '2026-08-24T12:00:00Z', endAt: '2026-08-24T13:00:00Z', kind: 'closed', note: 'Lunch' }];

  const duringLunch = checkAvailability({ workingHours: MON_9_5, exceptions, requestedStart: '2026-08-24T12:15:00Z' });
  assert.equal(duringLunch.ok, false);
  assert.equal(duringLunch.reason, 'blocked');

  const beforeLunch = checkAvailability({ workingHours: MON_9_5, exceptions, requestedStart: '2026-08-24T11:00:00Z' });
  assert.deepEqual(beforeLunch, { ok: true });
});

test('blocked holiday/personal period: a closed exception spanning multiple days blocks every day in it', () => {
  const exceptions = [{ startAt: '2026-08-24T00:00:00Z', endAt: '2026-08-27T00:00:00Z', kind: 'closed', note: 'Vacation' }];
  const middleDay = checkAvailability({
    workingHours: [{ weekday: 2, startTime: '09:00', endTime: '17:00' }],
    exceptions,
    requestedStart: '2026-08-25T10:00:00Z', // Tuesday, in the middle of the 3-day block
  });
  assert.equal(middleDay.ok, false);
  assert.equal(middleDay.reason, 'blocked');
});

test('a closed exception blocks a slot even inside an open exception (explicit blocks always win)', () => {
  const exceptions = [
    { startAt: '2026-08-22T09:00:00Z', endAt: '2026-08-22T17:00:00Z', kind: 'open' },
    { startAt: '2026-08-22T12:00:00Z', endAt: '2026-08-22T13:00:00Z', kind: 'closed', note: 'Personal' },
  ];
  const result = checkAvailability({ workingHours: [], exceptions, requestedStart: '2026-08-22T12:15:00Z' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'blocked');
});

test('overlapping appointment: a slot that overlaps an existing call is rejected', () => {
  const existingCalls = [{ id: 'call-1', scheduledAt: '2026-08-24T10:00:00Z' }]; // 10:00-10:30
  const result = checkAvailability({
    workingHours: MON_9_5,
    existingCalls,
    requestedStart: '2026-08-24T10:15:00Z', // overlaps 10:15-10:45 vs 10:00-10:30
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'overlap');
});

test('back-to-back appointments are allowed, not rejected as an overlap', () => {
  const existingCalls = [{ id: 'call-1', scheduledAt: '2026-08-24T10:00:00Z' }]; // 10:00-10:30

  const immediatelyAfter = checkAvailability({
    workingHours: MON_9_5,
    existingCalls,
    requestedStart: '2026-08-24T10:30:00Z', // starts exactly when the previous one ends
  });
  assert.deepEqual(immediatelyAfter, { ok: true });

  const immediatelyBefore = checkAvailability({
    workingHours: MON_9_5,
    existingCalls,
    requestedStart: '2026-08-24T09:30:00Z', // ends exactly when the existing one starts
  });
  assert.deepEqual(immediatelyBefore, { ok: true });
});

// --- Timezone (docs/specs/2026-round2-fixes.md item 7) -------------------------------------
//
// Every test above omits `timezone`, which defaults to 'UTC' — since UTC-as-local is a no-op
// conversion, they're unaffected by (and don't exercise) the timezone-aware code path at all;
// they stay green precisely because introducing the column/param is non-breaking.
//
// The tests below use fixed-offset IANA zones with no DST (Asia/Kolkata +5:30, Asia/Tokyo +9:00,
// America/Bogota -5:00) specifically so expected wall-clock values never depend on what date the
// suite happens to run — a DST-observing zone would make these flaky twice a year.

test("regression: a 9-5 dietitian-local schedule renders as 9-5 for a same-timezone client (the reported bug)", () => {
  // The reported bug, reproduced exactly: a dietitian in a UTC-5 zone set 9:00 AM-5:00 PM and a
  // same-timezone client saw ~4:00 AM-11:30 AM — workingHours' raw "09:00"/"17:00" strings were
  // being compared against a candidate's *UTC* hour directly, silently treating dietitian-local
  // wall-clock input as if it were already UTC.
  const timezone = 'America/Bogota'; // fixed UTC-5
  const workingHours = [{ weekday: 1, startTime: '09:00', endTime: '17:00' }]; // Monday 9-5, Bogota-local

  const slots = listAvailableSlots({ workingHours, date: '2026-08-24', timezone });
  assert.ok(slots.length > 0, 'expected at least one slot');

  // Every slot, converted back into the dietitian's own zone, must fall within [9:00, 17:00) —
  // "slots shown to a client must match the dietitian's configured hours."
  for (const iso of slots) {
    const zoned = toZonedTime(iso, timezone);
    const minutes = zoned.getHours() * 60 + zoned.getMinutes();
    assert.ok(
      minutes >= 9 * 60 && minutes < 17 * 60,
      `slot ${iso} is ${zoned.getHours()}:${String(zoned.getMinutes()).padStart(2, '0')} in ${timezone}, outside 9-5`
    );
  }

  const first = toZonedTime(slots[0], timezone);
  const last = toZonedTime(slots[slots.length - 1], timezone);
  assert.equal(first.getHours(), 9);
  assert.equal(first.getMinutes(), 0);
  // Last bookable 30-minute slot start is 16:30 (ends exactly at the 17:00 close).
  assert.equal(last.getHours(), 16);
  assert.equal(last.getMinutes(), 30);

  // Pin the underlying UTC instant too, so this test would actually fail under the old bug (which
  // returned 09:00 UTC as the first slot, not 14:00 UTC).
  assert.equal(new Date(slots[0]).toISOString(), '2026-08-24T14:00:00.000Z');
});

test('a client several hours offset from the dietitian sees the identical instant, correctly shifted and labelled once', () => {
  const timezone = 'Asia/Kolkata'; // dietitian's zone, fixed UTC+5:30
  const workingHours = [{ weekday: 1, startTime: '09:00', endTime: '17:00' }];

  const slots = listAvailableSlots({ workingHours, date: '2026-08-24', timezone });
  const firstSlotUtc = slots[0];

  // In the dietitian's own zone this is exactly their configured opening time.
  const dietitianLocal = toZonedTime(firstSlotUtc, timezone);
  assert.equal(dietitianLocal.getHours(), 9);
  assert.equal(dietitianLocal.getMinutes(), 0);

  // The same underlying instant, viewed from Asia/Tokyo (fixed UTC+9 — 3h30m ahead of Kolkata),
  // must show the real difference: 12:30 PM. Not 9:00 (no conversion happened) and not some other
  // value (a double conversion, or the wrong direction).
  const clientLocal = toZonedTime(firstSlotUtc, 'Asia/Tokyo');
  assert.equal(clientLocal.getHours(), 12);
  assert.equal(clientLocal.getMinutes(), 30);
});

test('an appointment booked at a boundary slot round-trips without drift', () => {
  const timezone = 'Asia/Kolkata';
  const workingHours = [{ weekday: 1, startTime: '09:00', endTime: '17:00' }];

  const slots = listAvailableSlots({ workingHours, date: '2026-08-24', timezone });
  const lastSlot = slots[slots.length - 1]; // the last 30-minute slot that still ends by 17:00 -> 16:30 local

  // A slot that's *listed* as available must also pass the exact check a real booking runs — no
  // drift between "shown as available" and "actually bookable."
  assert.deepEqual(checkAvailability({ workingHours, timezone, requestedStart: lastSlot }), { ok: true });

  // Round-trip: the stored UTC instant, reconverted to the dietitian's local wall clock, is
  // exactly 16:30 — not 16:29/16:31, which a manual offset (+5.5-style) or double conversion could
  // easily produce.
  const zoned = toZonedTime(lastSlot, timezone);
  assert.equal(zoned.getHours(), 16);
  assert.equal(zoned.getMinutes(), 30);

  // One slot further (17:00 local start, would end 17:30 — past the 17:00 close) is rejected.
  const oneSlotLater = new Date(new Date(lastSlot).getTime() + CALL_DURATION_MINUTES * 60_000).toISOString();
  const pastClose = checkAvailability({ workingHours, timezone, requestedStart: oneSlotLater });
  assert.equal(pastClose.ok, false);
  assert.equal(pastClose.reason, 'outside_hours');
});

test('timezone defaults to UTC — an unset dietitian timezone keeps pre-fix behavior exactly (non-breaking column default)', () => {
  const workingHours = [{ weekday: 1, startTime: '09:00', endTime: '17:00' }];
  const withoutTimezone = checkAvailability({ workingHours, requestedStart: '2026-08-24T10:00:00Z' });
  const withUtcTimezone = checkAvailability({ workingHours, timezone: 'UTC', requestedStart: '2026-08-24T10:00:00Z' });
  assert.deepEqual(withoutTimezone, { ok: true });
  assert.deepEqual(withoutTimezone, withUtcTimezone);
});
