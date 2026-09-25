import { spawnSync } from 'node:child_process';
import { assertIntegrationTestsEnabled } from './integrationOptIn.js';

// Explicit opt-in; npm test never reaches these database-writing suites.
assertIntegrationTestsEnabled();
const result = spawnSync(process.execPath, ['--test', 'tests/integration/*.test.js'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
