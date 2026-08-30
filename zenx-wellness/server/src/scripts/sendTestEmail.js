// Manual test tool for the notification engine foundation — fires one real send (through the same
// sendEmail() entry point everything else will eventually use) using built-in sample data, then
// drains the queue once immediately so this script is self-contained (no separately running server
// process/worker required). Usage:
//
//   node src/scripts/sendTestEmail.js <templateKey> <to>
//   node src/scripts/sendTestEmail.js            (lists available template keys)
//
// Respects the same dev/test safety rail as everything else: outside NODE_ENV=production this
// always goes through the console/file transport (server/.local/emails/), never a real send.
import { pool } from '../db/pool.js';
import { sendEmail } from '../emails/sendEmail.js';
import { drainOnce } from '../emails/worker.js';
import { findEmailLogById } from '../models/EmailLog.js';
import { SAMPLE_DATA, TEMPLATE_KEYS } from '../emails/sampleData.js';

const [, , templateKey, to] = process.argv;

function printUsageAndExit() {
  console.log('Usage: node src/scripts/sendTestEmail.js <templateKey> <to>');
  console.log('Available template keys:');
  for (const key of TEMPLATE_KEYS) console.log(`  - ${key}`);
  process.exit(1);
}

async function main() {
  if (!templateKey || !to || !SAMPLE_DATA[templateKey]) printUsageAndExit();

  const queued = await sendEmail(to, templateKey, SAMPLE_DATA[templateKey]);
  console.log(`[test-email] queued email_log row ${queued.id} (status: ${queued.status})`);

  await drainOnce();
  const result = await findEmailLogById(queued.id);
  console.log(`[test-email] after drain: status=${result.status}${result.error ? ` error=${result.error}` : ''}`);
  if (result.status === 'sent') {
    console.log('[test-email] check server/.local/emails/ for the rendered .html/.txt files (console transport).');
  }

  await pool.end();
}

main().catch((err) => {
  console.error('[test-email] failed', err);
  process.exit(1);
});
