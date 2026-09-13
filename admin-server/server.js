import { app } from './src/app.js';
import { connectDb } from './src/config/db.js';
import { env } from './src/config/env.js';
import { assertEmailTransportConfigured, resolveTransportKind } from './src/emails/sendEmail.js';
import { startReminderScheduler } from './src/services/reminderScheduler.js';

async function main() {
  await connectDb();
  // Before listen(), so a deployment whose EMAIL_TRANSPORT/SMTP_HOST is missing dies at boot
  // instead of only failing on its first password-reset request.
  assertEmailTransportConfigured();
  console.log(`[email] transport: ${resolveTransportKind()}`);
  startReminderScheduler();
  const server = app.listen(env.port, () => console.log(`[server] listening on http://localhost:${env.port}`));

  // Node closes an idle keep-alive socket after 5s by default, but Chrome holds pooled sockets far
  // longer and will not silently retry a non-idempotent request onto one it finds already closed
  // (it does retry GETs, which is why only POSTs ever showed this). Sitting on the login form for
  // more than 5s and then submitting raced the POST onto a dead socket — ERR_CONNECTION_RESET, no
  // server-side log line, intermittent. Keep the server's idle window well above the browser's;
  // headersTimeout must stay above keepAliveTimeout or it pre-empts it.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
