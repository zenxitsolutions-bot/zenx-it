import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requestedSwapResolutions } from '../../src/services/planNotifications.js';

const meals = [
  { day: 'Monday', time: '08:00 AM', swapRequested: false },
  { day: 'Tuesday', time: '01:00 PM', swapRequested: true },
];

describe('client-requested meal swap notifications', () => {
  it('rejects notifications for ordinary recipe edits', () => {
    assert.throws(
      () => requestedSwapResolutions([meals[0]], [{ day: 'Monday', time: '08:00 AM' }]),
      (error) =>
        error.status === 400 &&
        error.message === 'A client swap request is required before notifying the client'
    );
  });

  it('rejects a resolution for a meal the client did not request to swap', () => {
    assert.throws(
      () => requestedSwapResolutions(meals, [{ day: 'Monday', time: '08:00 AM' }]),
      (error) =>
        error.status === 400 &&
        error.message === 'The selected meal does not have an active client swap request'
    );
  });

  it('allows notification only for the requested meal', () => {
    assert.deepEqual(
      requestedSwapResolutions(meals, [{ day: 'Tuesday', time: '01:00 PM' }]),
      [{ day: 'Tuesday', time: '01:00 PM' }]
    );
  });
});
