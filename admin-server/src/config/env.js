import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4001),
  mysqlUrl: required('MYSQL_URL', 'mysql://root:root@127.0.0.1:3307/zenx_admin'),

  adminJwtAccessSecret: required('ADMIN_JWT_ACCESS_SECRET', 'dev-admin-access-secret-change-me'),
  adminJwtRefreshSecret: required('ADMIN_JWT_REFRESH_SECRET', 'dev-admin-refresh-secret-change-me'),
  adminJwtAccessTtl: process.env.ADMIN_JWT_ACCESS_TTL || '15m',
  adminJwtRefreshTtl: process.env.ADMIN_JWT_REFRESH_TTL || '30d',

  customerJwtAccessSecret: required('CUSTOMER_JWT_ACCESS_SECRET', 'dev-customer-access-secret-change-me'),
  customerJwtRefreshSecret: required('CUSTOMER_JWT_REFRESH_SECRET', 'dev-customer-refresh-secret-change-me'),
  customerJwtAccessTtl: process.env.CUSTOMER_JWT_ACCESS_TTL || '15m',
  customerJwtRefreshTtl: process.env.CUSTOMER_JWT_REFRESH_TTL || '30d',

  // Comma-separated: this backend serves both the admin portal origin and the public marketing
  // site's origin (its contact form hits the one public enquiry route).
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5174,http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'ZenX Admin <onboarding@resend.dev>',
  // Inbox that receives a copy of every public contact-form enquiry. Optional: unset skips the
  // staff email (the enquiry is still saved and the in-app notification is still created).
  enquiryNotifyEmail: process.env.ENQUIRY_NOTIFY_EMAIL || '',

  // Where + how to sign the SSO handoff token for the one downstream application this deployment
  // knows about. A real multi-application setup would look this up per-row from the `applications`
  // table (which it still does — see Application.js) — these two env vars are only the seed data
  // for that row's initial values, matching wellness-app's own `ZENX_HANDOFF_SECRET` on the
  // receiving end.
  zenxDietitianUrl: process.env.ZENX_DIETITIAN_URL || '',
  zenxDietitianHandoffSecret: process.env.ZENX_DIETITIAN_HANDOFF_SECRET || '',

  // Direct connection to wellness-app's own MySQL database — lets provisionCustomerAccount create
  // the zenx-dietitian grant's user there eagerly (see models/WellnessDb.js) instead of only ever
  // via the SSO handoff's lazy first-login creation (wellness-app/server/src/controllers/
  // auth.controller.js#handoff). Optional: unset in a deployment that doesn't have DB-level access
  // to wellness-app (e.g. it runs on a separate host) — that eager step is skipped, not fatal.
  wellnessMysqlUrl: process.env.WELLNESS_MYSQL_URL || '',

  // Follow-up reminder/overdue poller (src/services/reminderScheduler.js). Default 60s — must stay
  // well under the smallest FOLLOWUP_REMINDERS value (15 minutes) so the due-window query never
  // skips a follow-up between ticks.
  reminderSchedulerIntervalMs: Number(process.env.REMINDER_SCHEDULER_INTERVAL_MS || 60 * 1000),
};
