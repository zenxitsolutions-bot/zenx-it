import { sendEmail } from '../emails/sendEmail.js';
import { canNotifyUser } from './notifyGuard.js';
import { portalPathUrl } from '../utils/urls.js';
import { companyDisplayName } from '../utils/companyBrand.js';
import { formatInZone, effectiveTimezone } from './timezoneService.js';

function formatDate(date, timezone) {
  return formatInZone(date, timezone, 'd MMM yyyy');
}

function formatScheduleList(createdCalls, timezone) {
  return createdCalls
    .map((c) => new Date(c.scheduledAt))
    .sort((a, b) => a - b)
    .map((date) => `• ${formatInZone(date, timezone)} (${timezone})`)
    .join('\n');
}

// Sent once when a dietitian first saves or regenerates a recurring consultation schedule — a
// dated list only, no join links. Each occurrence later gets its own reminder email (with the
// meeting link and time) 3 days before, via reminderScheduler.js. No .ics here: a multi-event
// attachment isn't worth the complexity for a summary, and every call it mentions is already
// visible from the app.
export async function notifyScheduleGenerated({ schedule, client, dietitian, createdCalls, newGaps }) {
  if (createdCalls.length === 0) return;

  const clientTimezone = effectiveTimezone(client);
  const dietitianTimezone = effectiveTimezone(dietitian);
  const sortedDates = createdCalls.map((c) => new Date(c.scheduledAt)).sort((a, b) => a - b);
  const dateRange = `${formatDate(sortedDates[0], dietitianTimezone)} – ${formatDate(sortedDates[sortedDates.length - 1], dietitianTimezone)}`;
  const loginUrl = portalPathUrl(client, '/app/calls');
  // A stable key per distinct batch (not per attempt) — a literal retry that recomputes the exact
  // same new instants naturally lands on the same key and is deduplicated by sendEmail's own
  // idempotency, consistent with "generation is idempotent" applying to notifications too.
  const batchKey = `${schedule.id}:${createdCalls.length}:${sortedDates[0].getTime()}:${sortedDates[sortedDates.length - 1].getTime()}`;

  if (canNotifyUser(client)) try {
    await sendEmail(
      client.email,
      'consultation-schedule-generated',
      {
        client_name: client.name,
        dietitian_name: dietitian.name,
        count: String(createdCalls.length),
        date_range: dateRange,
        schedule_list: formatScheduleList(createdCalls, clientTimezone),
        login_url: loginUrl,
      },
      { idempotencyKey: `consultation-schedule-generated:${batchKey}:client`, relatedEntity: { type: 'client', id: client.id } }
    );
  } catch (err) {
    console.error(`[notifications] failed to queue consultation-schedule-generated email for client ${client.id}:`, err);
  }

  const gapNotice = newGaps.length > 0 ? `Note: ${newGaps.length} occurrence(s) couldn't be scheduled and need your attention.` : '';
  const companyName = await companyDisplayName(dietitian.companyId || client.companyId);
  if (canNotifyUser(dietitian)) try {
    await sendEmail(
      dietitian.email,
      'consultation-schedule-generated-dietitian',
      {
        client_name: client.name,
        dietitian_name: dietitian.name,
        count: String(createdCalls.length),
        date_range: dateRange,
        schedule_list: formatScheduleList(createdCalls, dietitianTimezone),
        login_url: loginUrl,
        gap_notice: gapNotice,
        company_name: companyName,
      },
      { idempotencyKey: `consultation-schedule-generated:${batchKey}:dietitian`, relatedEntity: { type: 'client', id: client.id } }
    );
  } catch (err) {
    console.error(`[notifications] failed to queue consultation-schedule-generated-dietitian email for dietitian ${dietitian.id}:`, err);
  }
}
