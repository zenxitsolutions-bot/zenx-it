import assert from 'node:assert/strict';
import test from 'node:test';
import { createCallSlotOptions } from './callSlotLabels.js';

const normalize = (options) => options.map((option) => ({
  ...option, label: option.label.replace(/\s/g, ' '),
}));

for (const [timezone, slots, offsets] of [
  ['America/New_York', ['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z'], ['GMT-04:00', 'GMT-05:00']],
  ['America/Chicago', ['2026-11-01T06:30:00Z', '2026-11-01T07:30:00Z'], ['GMT-05:00', 'GMT-06:00']],
  ['America/Los_Angeles', ['2026-11-01T08:30:00Z', '2026-11-01T09:30:00Z'], ['GMT-07:00', 'GMT-08:00']],
]) {
  test(`repeated local slots in ${timezone} have distinct offsets and unchanged UTC values`, () => {
    assert.deepEqual(normalize(createCallSlotOptions(slots, timezone)), [
      { value: slots[0], label: `1:30 AM (${offsets[0]})` },
      { value: slots[1], label: `1:30 AM (${offsets[1]})` },
    ]);
  });
}

test('only duplicated local times receive offsets; other labels stay compact', () => {
  const slots = ['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z', '2026-11-01T07:00:00Z'];
  assert.deepEqual(normalize(createCallSlotOptions(slots, 'America/New_York')), [
    { value: slots[0], label: '1:30 AM (GMT-04:00)' },
    { value: slots[1], label: '1:30 AM (GMT-05:00)' },
    { value: slots[2], label: '2:00 AM' },
  ]);
  assert.deepEqual(normalize(createCallSlotOptions(slots, 'Asia/Kolkata')), [
    { value: slots[0], label: '11:00 AM' },
    { value: slots[1], label: '12:00 PM' },
    { value: slots[2], label: '12:30 PM' },
  ]);
});

test('an unavailable or empty list produces no options', () => {
  assert.deepEqual(createCallSlotOptions(undefined, 'America/New_York'), []);
  assert.deepEqual(createCallSlotOptions([], 'Asia/Kolkata'), []);
});
