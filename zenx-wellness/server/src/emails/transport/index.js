import { env } from '../../config/env.js';
import { sendViaConsole } from './consoleTransport.js';
import { sendViaResend } from './resendTransport.js';

const TRANSPORTS = { console: sendViaConsole, resend: sendViaResend };

// Defaults to 'console' outside production, so an unconfigured dev install still never sends real
// email by accident — but development may opt in explicitly with EMAIL_TRANSPORT=resend (useful for
// verifying a real password-reset delivery end to end). `test` keeps the old hard rail: a test run
// must never reach a mail provider no matter what the environment says. In production the default
// is 'resend' and RESEND_API_KEY must actually be set ("fail loudly if production config is
// missing").
export function resolveTransportKind() {
  const explicit = env.emailTransport || null;

  if (env.nodeEnv === 'test') {
    if (explicit && explicit !== 'console') {
      throw new Error(
        `EMAIL_TRANSPORT="${explicit}" is not allowed when NODE_ENV=test — tests always use the ` +
          'console/file transport.'
      );
    }
    return 'console';
  }

  const kind = explicit || (env.nodeEnv === 'production' ? 'resend' : 'console');
  if (!TRANSPORTS[kind]) throw new Error(`Unknown EMAIL_TRANSPORT: "${kind}"`);
  if (kind === 'resend' && !env.resendApiKey) {
    throw new Error('RESEND_API_KEY is required when EMAIL_TRANSPORT=resend.');
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
