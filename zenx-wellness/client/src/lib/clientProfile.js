// Read-model helpers for the dietitian/admin client profile page (spec §6) — kept out of
// components per CLAUDE.md §3.
import { WEEKDAYS, parseTimeToMinutes } from './clientPortal';
import { addCalendarDays, toCalendarDate } from './calendarDate';

// A plan's `week` is the civil start date the dietitian picked (any weekday). A meal's calendar
// date is that day plus its positional offset — not "Monday + weekday index."
function dateForMeal(plan, day) {
  const offset = WEEKDAYS.indexOf(day);
  if (offset < 0) return null;
  const start = toCalendarDate(plan.week);
  if (!start) return null;
  return addCalendarDays(start, offset);
}

// Flattens every meal across a client's plans into the last `days` calendar days (inclusive of
// today), each carrying its own computed date — since a plan document is a whole week, this can
// span more than one plan once the window crosses a week boundary. Most recent first.
export function getRecentMeals(plans, days = 15, now = new Date()) {
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)))
    .toISOString()
    .slice(0, 10);
  const windowEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);

  const entries = [];
  for (const plan of plans ?? []) {
    for (const meal of plan.meals ?? []) {
      const date = dateForMeal(plan, meal.day);
      if (!date || date < windowStart || date > windowEnd) continue;
      entries.push({ ...meal, date, planId: plan._id });
    }
  }

  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return parseTimeToMinutes(b.time) - parseTimeToMinutes(a.time);
  });
  return entries;
}

// Buckets a call into one of the five states spec §6 item 4 asks the history to cover. "previous"
// is the fallback for a call whose time has passed but was never explicitly marked
// completed/cancelled (a missed/no-show, or simply not yet wrapped up) — distinct from
// "completed", which means the dietitian actively marked it done.
export function categorizeCall(call, now = new Date()) {
  if (call.status === 'cancelled') return { bucket: 'cancelled', label: 'Cancelled' };
  if (call.status === 'completed') return { bucket: 'completed', label: 'Completed' };
  const isUpcoming = new Date(call.scheduledAt).getTime() >= now.getTime();
  return isUpcoming ? { bucket: 'upcoming', label: 'Upcoming' } : { bucket: 'previous', label: 'Previous' };
}

export const CALL_HISTORY_SECTIONS = [
  { bucket: 'upcoming', title: 'Upcoming' },
  { bucket: 'previous', title: 'Previous' },
  { bucket: 'completed', title: 'Completed' },
  { bucket: 'cancelled', title: 'Cancelled' },
];

// Groups a client's calls into the four display sections above, each already sorted
// newest-scheduled-first within the group. A call also carries `isRescheduled` (independent of
// bucket — an upcoming call can have been rescheduled once already) via `rescheduledAt`.
export function groupCallHistory(calls, now = new Date()) {
  const groups = Object.fromEntries(CALL_HISTORY_SECTIONS.map((s) => [s.bucket, []]));
  for (const call of calls ?? []) {
    const { bucket } = categorizeCall(call, now);
    groups[bucket].push({ ...call, isRescheduled: Boolean(call.rescheduledAt) });
  }
  for (const bucket of Object.keys(groups)) {
    groups[bucket].sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  }
  return groups;
}
