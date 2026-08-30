import { app } from './src/app.js';
import { connectDb } from './src/config/db.js';
import { env } from './src/config/env.js';
import { assertEmailTransportConfigured } from './src/emails/transport/index.js';
import { startEmailWorker } from './src/emails/worker.js';
import { startConsultationScheduleJob } from './src/services/consultationScheduleJob.js';
import { startReminderScheduler } from './src/services/reminderScheduler.js';

async function main() {
  // Fails loudly here, before the server accepts any traffic, if EMAIL_TRANSPORT/RESEND_API_KEY
  // isn't valid for this NODE_ENV — see src/emails/transport/index.js.
  assertEmailTransportConfigured();
  await connectDb();
  startEmailWorker();
  startConsultationScheduleJob();
  startReminderScheduler();
  const server = app.listen(env.port, () => console.log(`[server] listening on http://localhost:${env.port}`));

  // Same reason as admin-server's identical block: Node drops an idle keep-alive socket after 5s,
  // Chrome keeps pooled sockets longer and won't silently retry a POST onto a dead one, so a login
  // submitted after the form had been open a few seconds could come back as ERR_CONNECTION_RESET
  // with nothing logged server-side. headersTimeout must stay above keepAliveTimeout.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
