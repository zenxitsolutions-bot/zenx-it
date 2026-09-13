import { addMonths, format } from 'date-fns';

// Fixed, non-admin-managed duration choices for a client's Plan (see program_plans in
// schema.sql) — unlike the Plan itself, these aren't a CRUD entity, just a shared enum, so this
// constant is deliberately duplicated on the client (client/src/lib/planDurations.js) the same
// way CALL_DURATION_MINUTES already is.
export const PLAN_DURATIONS = ['1 month', '3 months', '6 months', '12 months'];

export const DURATION_MONTHS = { '1 month': 1, '3 months': 3, '6 months': 6, '12 months': 12 };

export function planEndDate(startYmd, durationLabel) {
  const months = DURATION_MONTHS[durationLabel];
  if (!months || !startYmd) return null;
  const [year, month, day] = String(startYmd).split('-').map(Number);
  if (!year || !month || !day) return null;
  return format(addMonths(new Date(year, month - 1, day), months), 'yyyy-MM-dd');
}

// Inclusive through the computed end date (matches the welcome-email range). Expired the day after.
export function isPlanFinished(startYmd, durationLabel, todayYmd) {
  const end = planEndDate(startYmd, durationLabel);
  return Boolean(end && todayYmd && todayYmd > end);
}
