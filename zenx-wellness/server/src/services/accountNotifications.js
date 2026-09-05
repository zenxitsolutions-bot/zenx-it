import { addMonths, format } from 'date-fns';
import { findUserById } from '../models/User.js';
import { sendEmail } from '../emails/sendEmail.js';
import { canNotifyUser } from './notifyGuard.js';
import { companyLoginUrl } from '../utils/urls.js';

// Matches the fixed choices in constants/planDurations.js. No explicit start/end date exists
// anywhere in the schema for a client's plan — "validity dates" is computed here from the
// account's own createdAt, since that's the only real date on hand. Documented as a judgment call,
// not a stored fact: if an explicit start date is ever added to the data model, this should read
// it instead of assuming enrollment started at account creation.
const DURATION_MONTHS = { '1 month': 1, '3 months': 3, '6 months': 6, '12 months': 12 };

function formatPlanDuration(durationLabel, startDate) {
  const months = DURATION_MONTHS[durationLabel];
  if (!months) return 'Your dietitian will confirm this soon';
  const end = addMonths(startDate, months);
  return `${durationLabel} (${format(startDate, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')})`;
}

// Called only for role: 'client' accounts, from every place one gets created (admin's
// user.controller.js#createUser, and enquiry.controller.js's Converted transition) — a dietitian/
// admin account created via the same POST /users endpoint never reaches this. `plainPassword` must
// be passed by the caller: by the time a `user` row exists it only holds a bcrypt hash, which is
// unrecoverable — the plaintext only ever exists transiently in the request that created it.
export async function notifyClientAccountCreated(user, { plainPassword }) {
  try {
    if (!canNotifyUser(user)) return;
    const dietitianName = user.assignedDietitian
      ? (await findUserById(user.assignedDietitian).catch(() => null))?.name ?? 'your Nourishly dietitian'
      : 'your Nourishly team';

    await sendEmail(
      user.email,
      'client-welcome',
      {
        client_name: user.name,
        dietitian_name: dietitianName,
        plan_name: user.programPlan?.name ?? 'Not yet assigned',
        plan_duration: user.planDuration ? formatPlanDuration(user.planDuration, user.createdAt) : 'Your dietitian will confirm this soon',
        temp_password: plainPassword,
        login_url: companyLoginUrl(user),
      },
      { idempotencyKey: `client-welcome:${user.id}`, relatedEntity: { type: 'client', id: user.id } }
    );
  } catch (err) {
    console.error(`[notifications] failed to queue welcome email for user ${user.id}:`, err);
  }
}
