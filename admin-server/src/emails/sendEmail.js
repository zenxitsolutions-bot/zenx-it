import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../config/env.js';

// Simple direct send, not a queued worker — this backend's email volume (staff invites, password
// resets, customer welcomes) doesn't need wellness-app's retry/backoff queue. It does now share
// that app's transport *selection* though (EMAIL_TRANSPORT, same names and same defaulting rule),
// so the two backends are configured the same way even where their delivery machinery differs.

let resendClient;
function getResendClient() {
  resendClient ??= new Resend(env.resendApiKey);
  return resendClient;
}

// Pooled and reused across sends: a fresh connection per email means a new TCP + TLS handshake and
// a fresh AUTH round-trip every time, which is what makes naive SMTP senders slow and gets them
// rate-limited by providers that cap connections-per-minute.
let smtpTransporter;
function getSmtpTransporter() {
  smtpTransporter ??= nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    // Omitted entirely when no user is set — passing `auth: { user: '', pass: '' }` makes
    // nodemailer attempt AUTH with empty credentials instead of skipping it, which an
    // IP-authenticated relay rejects outright.
    ...(env.smtpUser ? { auth: { user: env.smtpUser, pass: env.smtpPass } } : {}),
  });
  return smtpTransporter;
}

// Unset resolves to 'console' outside production so an unconfigured dev install never sends real
// mail by accident; production defaults to 'smtp'. Validated here rather than at the send site so
// a typo'd EMAIL_TRANSPORT fails with the list of real options instead of silently falling through.
export function resolveTransportKind() {
  const kind = env.emailTransport || (env.nodeEnv === 'production' ? 'smtp' : 'console');
  if (!['console', 'smtp', 'resend'].includes(kind)) {
    throw new Error(`Unknown EMAIL_TRANSPORT: "${kind}" (expected one of: console, smtp, resend)`);
  }
  if (kind === 'smtp' && !env.smtpHost) throw new Error('SMTP_HOST is required when EMAIL_TRANSPORT=smtp.');
  if (kind === 'resend' && !env.resendApiKey) throw new Error('RESEND_API_KEY is required when EMAIL_TRANSPORT=resend.');
  return kind;
}

// Called once at boot (server.js) so a missing or invalid email config fails loudly at startup
// rather than at 2am on the first password-reset request of a deployment nobody tested.
export function assertEmailTransportConfigured() {
  resolveTransportKind();
}

export async function sendEmail({ to, subject, html, text }) {
  const kind = resolveTransportKind();

  if (kind === 'console') {
    console.log(`[email:console] to=${to} subject="${subject}"\n${text || html}`);
    return;
  }

  if (kind === 'smtp') {
    try {
      await getSmtpTransporter().sendMail({ from: env.emailFrom, to, subject, html, text });
    } catch (err) {
      console.error(`[email] SMTP send failed to=${to} subject="${subject}":`, err);
      throw new Error(err.message || 'SMTP send failed');
    }
    return;
  }

  const { error } = await getResendClient().emails.send({ from: env.emailFrom, to, subject, html, text });
  if (error) {
    console.error(`[email] Resend send failed to=${to} subject="${subject}":`, error);
    throw new Error(error.message || 'Resend send failed');
  }
}
