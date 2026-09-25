import test from 'node:test';
import assert from 'node:assert/strict';
import { assertIntegrationTestsEnabled } from '../integrationOptIn.js';

test('database-writing integration suites require explicit non-production opt-in', () => {
  assert.throws(() => assertIntegrationTestsEnabled({}));
  assert.throws(() => assertIntegrationTestsEnabled({ RUN_INTEGRATION_TESTS: '0' }));
  assert.throws(() => assertIntegrationTestsEnabled({ RUN_INTEGRATION_TESTS: '1', NODE_ENV: 'production' }));
  assert.doesNotThrow(() => assertIntegrationTestsEnabled({ RUN_INTEGRATION_TESTS: '1', NODE_ENV: 'test' }));
});
