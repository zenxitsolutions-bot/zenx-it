import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

// Constructed lazily so importing this module never crashes the server — resolveTransportKind
// (index.js) is what guarantees SMTP_HOST is actually present before this transport is ever
// selected, mirroring resendTransport.js's lazy-client pattern.
//
// The transporter is created once and reused: nodemailer keeps the connection alive across sends,
// so the queue worker draining a batch pays for one TCP + TLS handshake and one AUTH round-trip
// instead of one per email. That matters more here than in admin-server — worker.js sends in
// batches of EMAIL_QUEUE_BATCH_SIZE, and providers that cap connections-per-minute will throttle a
// sender that reconnects for every message.
let transporter;
function getTransporter() {
  if (!env.smtpHost) throw new Error('SMTP_HOST is not configured');
  transporter ??= nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    // Omitted entirely when no user is set — passing `auth: { user: '', pass: '' }` makes
    // nodemailer attempt AUTH with empty credentials instead of skipping it, which an
    // IP-authenticated internal relay rejects outright.
    ...(env.smtpUser ? { auth: { user: env.smtpUser, pass: env.smtpPass } } : {}),
  });
  return transporter;
}

export async function sendViaSmtp({ to, subject, html, text, attachments = [] }) {
  // Unlike Resend's API (which wants base64), nodemailer takes the raw string or Buffer and does
  // its own encoding — passing base64 here would deliver a .ics the calendar client can't parse.
  const mailAttachments = attachments.length
    ? attachments.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        content: attachment.content,
      }))
    : undefined;
  const info = await getTransporter().sendMail({ from: env.emailFrom, to, subject, html, text, attachments: mailAttachments });
  return { providerMessageId: info?.messageId ?? null };
}
