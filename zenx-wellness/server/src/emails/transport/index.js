import { env } from '../../config/env.js';
import { sendViaConsole } from './consoleTransport.js';
import { sendViaResend } from './resendTransport.js';

const TRANSPORTS = { console: sendViaConsole, resend: sendViaResend };

// Outside production this ALWAYS resolves to 'console' — not just a default, an enforced rail for
// "never send real email from dev or test": explicitly setting EMAIL_TRANSPORT to anything else in
// a non-production NODE_ENV is a startup error, not a silent override. In production it defaults
// to 'resend' and requires RESEND_API_KEY to actually be set ("fail loudly if production config is
// missing").
export function resolveTransportKind() {
  const explicit = env.emailTransport || null;

  if (env.nodeEnv !== 'production') {
    if (explicit && explicit !== 'console') {
      throw new Error(
        `EMAIL_TRANSPORT="${explicit}" is not allowed outside production — dev and test always use ` +
          'the console/file transport.'
      );
    }
    return 'console';
  }

  const kind = explicit || 'resend';
  if (!TRANSPORTS[kind]) throw new Error(`Unknown EMAIL_TRANSPORT: "${kind}"`);
  if (kind === 'resend' && !env.resendApiKey) {
    throw new Error('RESEND_API_KEY is required in production when EMAIL_TRANSPORT=resend (the default).');
  }
  return kind;
}

// Called once at server boot (server.js) so a missing/invalid production config fails loudly
// before the process starts accepting traffic or queuing emails it can never send.
export function assertEmailTransportConfigured() {
  resolveTransportKind();
}

export async function sendViaTransport(message) {
  const kind = resolveTransportKind();
  return TRANSPORTS[kind](message);
}
