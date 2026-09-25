import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { assertLocalSetupEnvironment } from '../zenx-wellness/server/src/scripts/localPermissionsSetup.js';

// Explicit local testing launcher: use the real API and database, but do not start background
// email, reminder, plan-expiry or appointment-generation jobs against the local test data.
const targets = {
  wellness: { directory: 'zenx-wellness/server', port: 4000 },
  admin: { directory: 'admin-server', port: 4001 },
};
const target = targets[process.argv[2]];
if (!target || process.argv.length !== 3) {
  console.error('Usage: node scripts/serve-local-api.mjs wellness|admin');
  process.exitCode = 1;
} else {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const directory = path.join(root, target.directory);
  process.chdir(directory);
  const moduleAt = (name) => import(pathToFileURL(path.join(directory, 'src', name)).href);
  let pool;
  try {
    const { env } = await moduleAt('config/env.js');
    assertLocalSetupEnvironment(env);
    if (env.port !== target.port || env.emailTransport !== 'console') throw new Error('Local configuration required');
    ({ pool } = await moduleAt('db/pool.js'));
    await pool.query('SELECT 1');
    const { app } = await moduleAt('app.js');
    const server = app.listen(target.port, '127.0.0.1', () => {
      console.log(`[local] ${process.argv[2]} API ready on http://localhost:${target.port}`);
      console.log('[local] Background jobs disabled; email uses console transport only.');
    });
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;
    server.on('error', async (error) => {
      console.error('[local] API could not listen', { code: error.code ?? 'LISTEN_FAILED' });
      await pool.end();
      process.exitCode = 1;
    });
    const stop = () => {
      server.close(async () => { await pool.end(); process.exit(0); });
      server.closeAllConnections();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } catch (error) {
    console.error('[local] API failed to start', { code: error.code ?? 'LOCAL_CONFIGURATION_REQUIRED' });
    if (pool) await pool.end();
    process.exitCode = 1;
  }
}
