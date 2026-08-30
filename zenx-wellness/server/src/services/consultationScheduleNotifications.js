import { formatInTimeZone } from 'date-fns-tz';
import { sendEmail } from '../emails/sendEmail.js';
import { env } from '../config/env.js';

function formatDate(date, timezone) {
  return formatInTimeZone(date, timezone, 'd MMM yyyy');
}

// Sent instead of N individual call-scheduled emails whenever a single generation run produces
// more than one new call (the initial window fill, or a full regenerate) — see
// consultationScheduleService.js#generateForSchedule for the >1-vs-exactly-1 decision. No .ics
// here: a multi-event attachment isn't worth the complexity for a summary email, and every call it
// mentions is already individually visible/manageable from the app.
export async function notifyScheduleGenerated({ schedule, client, dietitian, createdCalls, newGaps }) {
  if (createdCalls.length === 0) return;

  const timezone = dietitian.timezone || 'UTC';
  const sortedDates = createdCalls.map((c) => new Date(c.scheduledAt)).sort((a, b) => a - b);
  const dateRange = `${formatDate(sortedDates[0], timezone)} – ${formatDate(sortedDates[sortedDates.length - 1], timezone)}`;
  const loginUrl = `${env.clientOrigin}/app/calls`;
  // A stable key per distinct batch (not per attempt) — a literal retry that recomputes the exact
  // same new instants naturally lands on the same key and is deduplicated by sendEmail's own
  // idempotency, consistent with "generation is idempotent" applying to notifications too.
  const batchKey = `${schedule.id}:${createdCalls.length}:${sortedDates[0].getTime()}:${sortedDates[sortedDates.length - 1].getTime()}`;

  try {
    await sendEmail(
      client.email,
      'consultation-schedule-generated',
      { client_name: client.name, dietitian_name: dietitian.name, count: String(createdCalls.length), date_range: dateRange, login_url: loginUrl },
      { idempotencyKey: `consultation-schedule-generated:${batchKey}:client`, relatedEntity: { type: 'client', id: client.id } }
    );
  } catch (err) {
    console.error(`[notifications] failed to queue consultation-schedule-generated email for client ${client.id}:`, err);
  }

  const gapNotice = newGaps.length > 0 ? `Note: ${newGaps.length} occurrence(s) couldn't be scheduled and need your attention.` : '';
  try {
    await sendEmail(
      dietitian.email,
      'consultation-schedule-generated-dietitian',
      { client_name: client.name, dietitian_name: dietitian.name, count: String(createdCalls.length), date_range: dateRange, login_url: loginUrl, gap_notice: gapNotice },
      { idempotencyKey: `consultation-schedule-generated:${batchKey}:dietitian`, relatedEntity: { type: 'client', id: client.id } }
    );
  } catch (err) {
    console.error(`[notifications] failed to queue consultation-schedule-generated-dietitian email for dietitian ${dietitian.id}:`, err);
  }
}
