import test from 'node:test';
import assert from 'node:assert/strict';
import { planEndDate, isPlanFinished } from '../../src/constants/planDurations.js';

test('planEndDate adds the labelled number of months', () => {
  assert.equal(planEndDate('2026-09-07', '1 month'), '2026-10-07');
  assert.equal(planEndDate('2026-09-07', '3 months'), '2026-12-07');
  assert.equal(planEndDate('2026-01-31', '1 month'), '2026-02-28');
  assert.equal(planEndDate(null, '1 month'), null);
});

test('isPlanFinished is exclusive of the end date', () => {
  assert.equal(isPlanFinished('2026-09-07', '1 month', '2026-10-07'), false);
  assert.equal(isPlanFinished('2026-09-07', '1 month', '2026-10-08'), true);
  assert.equal(isPlanFinished('2026-09-07', '1 month', '2026-09-07'), false);
});
