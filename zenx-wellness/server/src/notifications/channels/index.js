import { sendEmail } from '../../emails/sendEmail.js';

// The extensible delivery-channel shape referenced throughout the timezone/scheduling rollout
// (reminderScheduler.js today, anything else that needs to notify someone later). Every channel
// exposes the same `send(notification)` contract so a caller never branches on which channel it's
// using — only email and inApp are real in this pass; sms/push are named, typed no-ops so adding a
// real provider later is a one-file swap-in here, not an architecture change.
//
// notification shape: { to, templateKey, params, idempotencyKey, relatedEntity } for email;
// whatever a future inApp/sms/push implementation needs for the others.
export const channels = {
  email: {
    async send({ to, templateKey, params, idempotencyKey, relatedEntity }) {
      return sendEmail(to, templateKey, params, { idempotencyKey, relatedEntity });
    },
  },
  // This app has no server-pushed in-app notification list today — the one "in-app reminder" that
  // exists (client/src/hooks/useCallReminders.js) is delivered entirely by the browser polling
  // GET /calls and computing its own due-window client-side, so there is nothing for the server to
  // dispatch. Kept as an explicit no-op (not omitted) so callers can still call `channels.inApp.send`
  // unconditionally without a feature check, and so a future real server-pushed in-app channel
  // (e.g. WebSocket/SSE) is a swap-in here.
  inApp: {
    async send() {
      return { delivered: false, reason: 'in-app delivery is client-side (useCallReminders.js polling), nothing to dispatch server-side' };
    },
  },
  sms: {
    async send() {
      throw new Error('SMS channel not implemented — interface reserved for future work');
    },
  },
  push: {
    async send() {
      throw new Error('Push channel not implemented — interface reserved for future work');
    },
  },
};
