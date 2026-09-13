import { format } from 'date-fns';
import { findUserById } from '../models/User.js';
import { sendEmail } from '../emails/sendEmail.js';
import { canNotifyUser } from './notifyGuard.js';
import { companyLoginUrl } from '../utils/urls.js';
import { companyDisplayName } from '../utils/companyBrand.js';
import { DURATION_MONTHS, planEndDate } from '../constants/planDurations.js';
import { toCalendarDate } from '../utils/calendarDate.js';

function formatPlanDuration(durationLabel, startDate) {
  const months = DURATION_MONTHS[durationLabel];
  if (!months) return 'Your dietitian will confirm this soon';
  const startYmd = toCalendarDate(startDate instanceof Date ? startDate.toISOString().slice(0, 10) : startDate) ?? startDate;
  const endYmd = planEndDate(startYmd, durationLabel);
  if (!endYmd) return durationLabel;
  const start = new Date(`${startYmd}T00:00:00`);
  const end = new Date(`${endYmd}T00:00:00`);
  return `${durationLabel} (${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')})`;
}

function planStartForUser(user) {
  return user.planStartedOn || (user.createdAt instanceof Date ? user.createdAt.toISOString().slice(0, 10) : user.createdAt);
}

export async function notifyClientAccountCreated(user, { plainPassword }) {
  try {
    if (!canNotifyUser(user)) return;
    const companyName = await companyDisplayName(user);
    const dietitianName = user.assignedDietitian
      ? (await findUserById(user.assignedDietitian).catch(() => null))?.name ?? 'your dietitian'
      : `your ${companyName} team`;

    await sendEmail(
      user.email,
      'client-welcome',
      {
        client_name: user.name,
        company_name: companyName,
        dietitian_name: dietitianName,
        plan_name: user.programPlan?.name ?? 'Not yet assigned',
        plan_duration: user.planDuration ? formatPlanDuration(user.planDuration, planStartForUser(user)) : 'Your dietitian will confirm this soon',
        temp_password: plainPassword,
        login_url: companyLoginUrl(user),
      },
      { idempotencyKey: `client-welcome:${user.id}`, relatedEntity: { type: 'client', id: user.id } }
    );
  } catch (err) {
    console.error(`[notifications] failed to queue welcome email for user ${user.id}:`, err);
  }
}

export async function notifyClientReactivated(user) {
  try {
    if (!canNotifyUser(user)) return;
    const companyName = await companyDisplayName(user);
    await sendEmail(
      user.email,
      'client-reactivated',
      {
        client_name: user.name,
        company_name: companyName,
        plan_name: user.programPlan?.name ?? 'Your program',
        plan_duration: user.planDuration ? formatPlanDuration(user.planDuration, planStartForUser(user)) : 'Your dietitian will confirm this soon',
        login_url: companyLoginUrl(user),
      },
      { idempotencyKey: `client-reactivated:${user.id}:${user.planStartedOn ?? Date.now()}`, relatedEntity: { type: 'client', id: user.id } }
    );
  } catch (err) {
    console.error(`[notifications] failed to queue reactivation email for user ${user.id}:`, err);
  }
}

// Sent while the account is still active, immediately before planExpiryJob flips it inactive —
// canNotifyUser would otherwise drop the email after deactivation.
export async function notifyClientPlanEnded(user) {
  try {
    if (!user?.email) return;
    const endedOn = planEndDate(user.planStartedOn, user.planDuration);
    await sendEmail(
      user.email,
      'client-plan-ended',
      {
        client_name: user.name,
        plan_name: user.programPlan?.name ?? 'Your program',
        plan_ended_on: endedOn ? format(new Date(`${endedOn}T00:00:00`), 'd MMM yyyy') : 'today',
      },
      { idempotencyKey: `client-plan-ended:${user.id}:${endedOn ?? Date.now()}`, relatedEntity: { type: 'client', id: user.id } }
    );
  } catch (err) {
    console.error(`[notifications] failed to queue plan-ended email for user ${user.id}:`, err);
  }
}
