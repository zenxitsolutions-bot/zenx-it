import { sendEmail } from '../../emails/sendEmail.js';
import { createNotification } from '../../models/Notification.js';

// The extensible delivery-channel shape (reminderScheduler.js today) — mirrors wellness-app's own
// server/src/notifications/channels/index.js (independent implementation, not shared — see that
// file's own comment on the deliberate no-shared-package convention). Every channel exposes the
// same `send(notification)` contract; only email and inApp are real in this pass, sms/push are
// named, typed no-ops so a real provider later is a one-file swap-in here.
export const channels = {
  email: {
    async send({ to, subject, html, text }) {
      return sendEmail({ to, subject, html, text });
    },
  },
  inApp: {
    async send({ kind, title, body, entityId }) {
      return createNotification({ kind, title, body, entityId });
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
