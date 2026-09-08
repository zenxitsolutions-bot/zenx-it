import { listActiveClientsWithPlans, updateUser as updateUserRecord, bumpRefreshTokenVersion } from '../models/User.js';
import { isPlanFinished } from '../constants/planDurations.js';
import { todayCalendarDate } from '../utils/calendarDate.js';
import { notifyClientPlanEnded } from './accountNotifications.js';
import { env } from '../config/env.js';

export async function runPlanExpiryJob() {
  const today = todayCalendarDate();
  const clients = await listActiveClientsWithPlans();
  let deactivated = 0;

  for (const client of clients) {
    if (!isPlanFinished(client.planStartedOn, client.planDuration, today)) continue;
    try {
      await notifyClientPlanEnded(client);
      await updateUserRecord(client.id, { accountStatus: 'inactive' });
      await bumpRefreshTokenVersion(client.id);
      deactivated += 1;
    } catch (err) {
      console.error(`[plan-expiry-job] failed to deactivate client ${client.id}:`, err);
    }
  }

  if (deactivated) {
    console.log(`[plan-expiry-job] deactivated ${deactivated} client${deactivated === 1 ? '' : 's'} whose plan ended`);
  }
  return deactivated;
}

export function startPlanExpiryJob() {
  runPlanExpiryJob().catch((err) => console.error('[plan-expiry-job] initial run failed:', err));

  const handle = setInterval(() => {
    runPlanExpiryJob().catch((err) => console.error('[plan-expiry-job] run failed:', err));
  }, env.planExpiryJobIntervalMs);
  handle.unref?.();
  console.log(`[plan-expiry-job] running every ${env.planExpiryJobIntervalMs}ms`);
  return handle;
}
