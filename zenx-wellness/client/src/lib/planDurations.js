// Fixed, non-admin-managed duration choices for a client's Plan — deliberately duplicated from
// server/src/constants/planDurations.js (same pattern as CALL_DURATION_MINUTES), since this
// monorepo has no package shared between client/ and server/.
export const PLAN_DURATIONS = ['1 month', '3 months', '6 months', '12 months'];

const DURATION_MONTHS = { '1 month': 1, '3 months': 3, '6 months': 6, '12 months': 12 };

export function planEndDate(startYmd, durationLabel) {
  const months = DURATION_MONTHS[durationLabel];
  if (!months || !startYmd) return null;
  const [year, month, day] = String(startYmd).split('-').map(Number);
  if (!year || !month || !day) return null;
  const lastDay = new Date(year, month - 1 + months + 1, 0).getDate();
  const end = new Date(year, month - 1 + months, Math.min(day, lastDay));
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, '0');
  const d = String(end.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
