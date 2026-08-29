import { sendEmail } from './sendEmail.js';

// Matches sendStaffInviteEmail.js's shape exactly — this app's simple direct-send convention
// (sendEmail.js's own comment: no queue/retry infra, volume doesn't need it), not
// wellness-app's email_log queue.
export async function sendFollowupReminderEmail({ to, staffName, companyName, meetingTime, overdue = false }) {
  const verb = overdue ? 'is overdue' : 'is coming up';
  await sendEmail({
    to,
    subject: overdue ? `Overdue follow-up: ${companyName}` : `Reminder: follow-up with ${companyName}`,
    text: `Hi ${staffName},\n\nYour follow-up with ${companyName} ${verb}: ${meetingTime}`,
    html: `<p>Hi ${staffName},</p><p>Your follow-up with <strong>${companyName}</strong> ${verb}: <strong>${meetingTime}</strong></p>`,
  });
}
