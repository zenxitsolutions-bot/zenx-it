import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mysqlUrl: required('MYSQL_URL', 'mysql://root:@127.0.0.1:3306/nourishly'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Comma-separated extra origins (deploy previews, staging) allowed by CORS in addition to
  // CLIENT_ORIGIN. CLIENT_ORIGIN stays the canonical URL used in email links.
  clientOrigins: [
    ...new Set([
      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      ...(process.env.CLIENT_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ]),
  ],
  // Shared with admin-server's ZENX_DIETITIAN_HANDOFF_SECRET (see that repo's customerAuth
  // .controller.js#issueHandoffToken) — verifies the SSO token in auth.controller.js#handoff. Not
  // `required(...)`: unset must not crash the whole server on boot, same reasoning as
  // resendApiKey below — the handoff route itself rejects with a clear error if this is empty.
  zenxHandoffSecret: process.env.ZENX_HANDOFF_SECRET || '',
  // The real company id admin-server's seedLegacyCompany creates/prints (see that repo's seed.js).
  // Used once by db/migrate.js to backfill pre-multi-tenancy rows, and then at runtime as the
  // company the public, unauthenticated enquiry funnel (enquiry.controller.js#createEnquiry)
  // attaches a new lead to — there is only one public funnel today (a real per-company one, e.g.
  // resolved from a URL slug, is future work). Not `required(...)`: must not crash server boot: a
  // server that hasn't been migrated yet still needs to start so /health etc. work.
  legacyCompanyId: process.env.LEGACY_COMPANY_ID || '',
  // Not `required(...)`: an empty key must not crash the whole server on boot (every other route
  // still has to work without one configured) — utils/email.js throws a clear error at send time
  // instead, which forgotPassword's controller already catches and logs.
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Nourishly <onboarding@resend.dev>',
  // Google Calendar / Meet (services/googleMeet.js). Not `required(...)`: with these unset the
  // whole integration is simply inert — calls are still booked, just without a meeting link — so
  // an unconfigured install must not fail to boot. googleMeet.js#isGoogleConfigured is the single
  // place that decides whether the feature is on.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  // Must match a redirect URI registered on the OAuth client in Google Cloud Console, exactly.
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/integrations/google/callback',
  passwordResetTokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 60),
  // Notification engine (server/src/emails/). emailTransport is left as whatever was configured
  // (or undefined) here — transport/index.js#resolveTransportKind is what actually enforces the
  // "never a real send outside production" rule; env.js just passes the raw setting through.
  emailTransport: process.env.EMAIL_TRANSPORT || '',
  emailQueuePollIntervalMs: Number(process.env.EMAIL_QUEUE_POLL_INTERVAL_MS || 5000),
  emailQueueBatchSize: Number(process.env.EMAIL_QUEUE_BATCH_SIZE || 10),
  emailMaxAttempts: Number(process.env.EMAIL_MAX_ATTEMPTS || 5),
  // Consultation schedule rolling-window generator (server/src/services/consultationScheduleJob.js).
  // Default 24h — the window is 60 days, so it never needs sub-daily freshness.
  consultationScheduleJobIntervalMs: Number(process.env.CONSULTATION_SCHEDULE_JOB_INTERVAL_MS || 24 * 60 * 60 * 1000),
  // Reminder scheduler (server/src/services/reminderScheduler.js). Default 60s — must stay well
  // under the smallest CALL_REMINDER_OPTIONS value (10 minutes) so the due-window query never skips
  // a call between ticks.
  reminderSchedulerIntervalMs: Number(process.env.REMINDER_SCHEDULER_INTERVAL_MS || 60 * 1000),
};
