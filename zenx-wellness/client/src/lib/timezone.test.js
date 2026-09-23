import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalTimezone,
  mergeDetectedTimezoneUpdate,
  resolveViewerTimezone,
  timezoneOffsetLabel,
  zonedCalendarDate,
  zonedTimeToUtcIso,
} from './timezone.js';
import { formatDate, formatDateTime, formatTime } from './format.js';
import { addCalendarDays, formatCalendarDate, toCalendarDate } from './calendarDate.js';

// ICU releases may use either a normal or a narrow non-breaking space before AM/PM.
const text = (value) => value.replace(/\s/g, ' ');
const india = canonicalTimezone('Asia/Kolkata');

test('the current device zone wins over a stale profile and previous detected zone', () => {
  const result = resolveViewerTimezone({
    timezone: 'Asia/Kolkata',
    detectedTimezone: 'America/New_York',
  }, 'America/Los_Angeles');

  assert.equal(result.timezone, 'America/Los_Angeles');
  assert.equal(result.browserTimezone, 'America/Los_Angeles');
  assert.equal(result.scheduleTimezone, india);
  assert.equal(result.mismatch, true);
});

test('IANA aliases are equivalent rather than a false schedule/viewer mismatch', () => {
  assert.equal(canonicalTimezone('Asia/Calcutta'), india);
  assert.equal(canonicalTimezone('Etc/UTC'), 'UTC');
  const result = resolveViewerTimezone({ timezone: 'Asia/Kolkata' }, 'Asia/Calcutta');
  assert.equal(result.timezone, india);
  assert.equal(result.scheduleTimezone, india);
  assert.equal(result.mismatch, false);
});

test('invalid detection falls back to the previous detection, then profile, then UTC', () => {
  assert.equal(resolveViewerTimezone({
    detectedTimezone: 'Asia/Kolkata', timezone: 'America/Chicago',
  }, 'Not/A_Zone').timezone, india);
  assert.equal(resolveViewerTimezone({
    detectedTimezone: 'Not/A_Zone', timezone: 'America/Chicago',
  }, null).timezone, 'America/Chicago');
  assert.equal(resolveViewerTimezone({ timezone: 'Not/A_Zone' }, '').timezone, 'UTC');
  assert.equal(resolveViewerTimezone(null, null).timezone, 'UTC');
  for (const value of [null, undefined, '', 123, {}, 'Not/A_Zone']) {
    assert.equal(canonicalTimezone(value), null);
  }
});

test('a never-initialized legacy UTC schedule uses the detected local zone', () => {
  const result = resolveViewerTimezone({ timezone: 'UTC' }, 'Asia/Kolkata');
  assert.equal(result.timezone, india);
  assert.equal(result.scheduleTimezone, india);
  assert.equal(result.mismatch, false);
});

test('an initialized explicitly UTC schedule stays UTC when its owner travels', () => {
  const result = resolveViewerTimezone({
    timezone: 'UTC', detectedTimezone: 'Europe/London',
  }, 'America/Chicago');
  assert.equal(result.timezone, 'America/Chicago');
  assert.equal(result.scheduleTimezone, 'UTC');
  assert.equal(result.mismatch, true);
});

test('automatic detection merges into the same user without replacing newer profile edits', () => {
  const requested = { _id: 'dietitian-1', name: 'Old name', timezone: 'UTC' };
  const current = { ...requested, name: 'Updated name', phone: 'updated phone' };
  const result = mergeDetectedTimezoneUpdate(current, requested, {
    _id: 'dietitian-1', name: 'Old name', timezone: 'Asia/Kolkata', detectedTimezone: 'Asia/Kolkata',
  });
  assert.deepEqual(result, {
    ...current, timezone: 'Asia/Kolkata', detectedTimezone: 'Asia/Kolkata',
  });
  assert.equal(current.timezone, 'UTC', 'the previous state must not be mutated');
});

test('a profile timezone edit made during detection is not overwritten by its late response', () => {
  const requested = { id: 'dietitian-1', timezone: 'UTC' };
  const current = { ...requested, timezone: 'Europe/London' };
  assert.deepEqual(mergeDetectedTimezoneUpdate(current, requested, {
    _id: 'dietitian-1', timezone: 'Asia/Kolkata', detectedTimezone: 'Asia/Kolkata',
  }), { ...current, detectedTimezone: 'Asia/Kolkata' });
});

test('late detection responses cannot replace a different login, logout, or invalid response', () => {
  const requested = { _id: 'dietitian-1', timezone: 'UTC' };
  const updated = { ...requested, timezone: 'Asia/Kolkata', detectedTimezone: 'Asia/Kolkata' };
  const differentLogin = { _id: 'client-2', timezone: 'America/Chicago' };
  assert.equal(mergeDetectedTimezoneUpdate(differentLogin, requested, updated), differentLogin);
  assert.equal(mergeDetectedTimezoneUpdate(null, requested, updated), null);
  assert.equal(mergeDetectedTimezoneUpdate(requested, requested, { ...updated, _id: 'client-2' }), requested);
  assert.equal(mergeDetectedTimezoneUpdate(requested, requested, {
    ...updated, detectedTimezone: 'Not/A_Zone',
  }), requested);
});

const seasons = [
  {
    name: 'winter', instant: '2026-01-15T12:00:00.000Z', date: 'Jan 15, 2026',
    zones: [
      ['Asia/Kolkata', '5:30 PM', 'GMT+05:30', '2026-01-15T17:30'],
      ['America/New_York', '7:00 AM', 'GMT-05:00', '2026-01-15T07:00'],
      ['America/Chicago', '6:00 AM', 'GMT-06:00', '2026-01-15T06:00'],
      ['America/Los_Angeles', '4:00 AM', 'GMT-08:00', '2026-01-15T04:00'],
    ],
  },
  {
    name: 'summer', instant: '2026-07-15T12:00:00.000Z', date: 'Jul 15, 2026',
    zones: [
      ['Asia/Kolkata', '5:30 PM', 'GMT+05:30', '2026-07-15T17:30'],
      ['America/New_York', '8:00 AM', 'GMT-04:00', '2026-07-15T08:00'],
      ['America/Chicago', '7:00 AM', 'GMT-05:00', '2026-07-15T07:00'],
      ['America/Los_Angeles', '5:00 AM', 'GMT-07:00', '2026-07-15T05:00'],
    ],
  },
];

for (const season of seasons) {
  for (const [zone, time, offset, local] of season.zones) {
    test(`${season.name}: the same UTC call renders correctly in ${zone} and round-trips`, () => {
      assert.equal(text(formatTime(season.instant, zone)), time);
      assert.equal(text(formatDate(season.instant, undefined, zone)), season.date);
      assert.equal(text(formatDateTime(season.instant, zone)), `${season.date} · ${time}`);
      assert.equal(timezoneOffsetLabel(zone, new Date(season.instant)), offset);
      assert.equal(zonedTimeToUtcIso(local, zone), season.instant);
      assert.equal(zonedCalendarDate(season.instant, zone), season.instant.slice(0, 10));
    });
  }
}

test('a call can be the next calendar day in India and the previous day for US clients', () => {
  const instant = '2026-07-15T02:00:00.000Z';
  assert.equal(text(formatDateTime(instant, 'Asia/Kolkata')), 'Jul 15, 2026 · 7:30 AM');
  assert.equal(zonedCalendarDate(instant, 'Asia/Kolkata'), '2026-07-15');
  for (const [zone, time] of [
    ['America/New_York', '10:00 PM'],
    ['America/Chicago', '9:00 PM'],
    ['America/Los_Angeles', '7:00 PM'],
  ]) {
    assert.equal(text(formatDateTime(instant, zone)), `Jul 14, 2026 · ${time}`);
    assert.equal(zonedCalendarDate(instant, zone), '2026-07-14');
  }
});

test('display dates retain caller-selected fields while converting to the viewer zone', () => {
  assert.equal(formatDate('2026-07-15T02:00:00Z', {
    weekday: 'long', month: 'short', day: 'numeric',
  }, 'America/Los_Angeles'), 'Tuesday, Jul 14');
});

for (const [zone, before, after] of [
  ['America/New_York', '2026-03-08T06:59:00Z', '2026-03-08T07:00:00Z'],
  ['America/Chicago', '2026-03-08T07:59:00Z', '2026-03-08T08:00:00Z'],
  ['America/Los_Angeles', '2026-03-08T09:59:00Z', '2026-03-08T10:00:00Z'],
]) {
  test(`the spring DST jump is automatic in ${zone}`, () => {
    assert.equal(text(formatTime(before, zone)), '1:59 AM');
    assert.equal(text(formatTime(after, zone)), '3:00 AM');
    assert.equal(zonedCalendarDate(before, zone), '2026-03-08');
    assert.equal(zonedCalendarDate(after, zone), '2026-03-08');
  });
}

test('fall-back instants remain distinct even when the local clock hour repeats', () => {
  const earlier = new Date('2026-11-01T05:30:00Z');
  const later = new Date('2026-11-01T06:30:00Z');
  assert.equal(text(formatTime(earlier, 'America/New_York')), '1:30 AM');
  assert.equal(text(formatTime(later, 'America/New_York')), '1:30 AM');
  assert.equal(timezoneOffsetLabel('America/New_York', earlier), 'GMT-04:00');
  assert.equal(timezoneOffsetLabel('America/New_York', later), 'GMT-05:00');
});

test('date-only meal-plan dates are civil dates and must not undergo timestamp conversion', () => {
  const day = '2026-07-15';
  assert.equal(toCalendarDate(day), day);
  assert.equal(toCalendarDate(`${day}T00:00:00.000Z`), day);
  assert.equal(formatCalendarDate(day), 'Jul 15, 2026');
  assert.equal(formatCalendarDate(`${day}T00:00:00.000Z`), 'Jul 15, 2026');
  assert.equal(addCalendarDays('2026-03-07', 2), '2026-03-09');
  assert.equal(addCalendarDays('2026-10-31', 2), '2026-11-02');
});
