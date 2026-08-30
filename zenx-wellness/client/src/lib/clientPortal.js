// Read-model helpers for the client portal screens (Overview/Meals/Progress/Calls) — kept out of
// components per CLAUDE.md §3 ("no business logic in components").
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getTodayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

// Which of the 7 WEEKDAYS positional keys `date` falls on within a specific plan's week — the
// correct replacement for "today's real weekday name" wherever a lookup is scoped to one plan's
// meals (groupMealsByDay). WEEKDAYS is a set of 7 storage-positional keys, not a claim that
// position 0 is a real Monday (see DayTabs.jsx's own comment on the same split) — once
// weekStart can be any date (not just a real Monday), getTodayName() is only the right key when
// today happens to fall on the plan's own day-0. `weekStart` is a plain "YYYY-MM-DD" string (UTC-
// midnight per the ISO 8601 date-only spec — see planBuilder.js), so it's read with UTC getters;
// `date` is the user's own local "today," read with local getters — comparing each one the way it
// was meant to be read avoids a local/UTC calendar-day mismatch on either side. Returns null if
// `date` falls outside this plan's 7-day window (a past/future week's plan, or no plan at all).
export function getDayKeyForDate(weekStart, date = new Date()) {
  if (!weekStart) return null;
  const start = new Date(weekStart);
  // Both sides are "calendar digits reinterpreted as a UTC epoch" — a pure day-count, not a real
  // elapsed-time comparison (which would skew by the local UTC offset if one side were a genuine
  // local-midnight instant and the other a genuine UTC-midnight one). Same date-only-arithmetic
  // idiom already used by consultationScheduleService.js's addCalendarDays/weekdayOf.
  const startDayCount = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const targetDayCount = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = Math.round((targetDayCount - startDayCount) / (24 * 60 * 60 * 1000));
  return offset >= 0 && offset < 7 ? WEEKDAYS[offset] : null;
}

// Exported so client/src/lib/clientProfile.js's meal-history sort can reuse the exact same
// "8:00 AM"-style parsing instead of a second, potentially-drifting implementation.
export function parseTimeToMinutes(time) {
  const [clock, meridiem] = time.split(' ');
  let [hours, minutes] = clock.split(':').map(Number);
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + (minutes || 0);
}

export function groupMealsByDay(plan) {
  const map = Object.fromEntries(WEEKDAYS.map((day) => [day, []]));
  for (const meal of plan?.meals ?? []) {
    (map[meal.day] ??= []).push(meal);
  }
  for (const day of Object.keys(map)) {
    map[day].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  }
  return map;
}

// The "up next" meal for today: the earliest not-yet-eaten meal, or the day's first meal if
// everything is already marked eaten. Uses getDayKeyForDate (today's position within THIS plan's
// own week), not getTodayName() (today's real weekday name) — the two only agree when the plan's
// week happens to start on a real Monday.
export function getTodayHighlightMeal(plan) {
  const todayKey = getDayKeyForDate(plan?.week);
  const todaysMeals = todayKey ? groupMealsByDay(plan)[todayKey] : [];
  if (!todaysMeals?.length) return null;
  return todaysMeals.find((meal) => !meal.completed) ?? todaysMeals[0];
}

export function computeMealCompletion(plan) {
  const meals = plan?.meals ?? [];
  return { completed: meals.filter((meal) => meal.completed).length, total: meals.length };
}

export function splitCalls(calls) {
  const now = Date.now();
  const upcoming = [];
  const past = [];
  for (const call of calls ?? []) {
    if (call.status === 'scheduled' && new Date(call.scheduledAt).getTime() >= now) upcoming.push(call);
    else past.push(call);
  }
  upcoming.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  past.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  return { upcoming, past };
}

export function getNextCall(calls) {
  return splitCalls(calls).upcoming[0] ?? null;
}

// Body measurements tracked alongside weight (spec §3.1) — one place both the My Progress screen
// and the Client Dashboard snapshot derive their "current vs previous" cards and history table
// from, so the two never drift on which fields exist or how a delta/direction is computed.
export const PROGRESS_MEASUREMENTS = [
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'hip', label: 'Hip', unit: 'cm' },
  { key: 'thigh', label: 'Thigh', unit: 'cm' },
  { key: 'upperArm', label: 'Upper arm', unit: 'cm' },
];

// hasPrevious distinguishes "only one record exists yet" from "this field just wasn't recorded on
// the previous entry" — the two empty states the spec calls out need different copy.
function measurementChange(field, latest, previous, hasPrevious) {
  const latestValue = latest?.[field.key] ?? null;
  const previousValue = previous?.[field.key] ?? null;
  const delta = latestValue != null && previousValue != null ? latestValue - previousValue : null;
  return {
    ...field,
    latestValue,
    previousValue,
    hasPrevious,
    delta,
    direction: delta == null ? null : delta === 0 ? 'same' : delta > 0 ? 'up' : 'down',
  };
}

// Empty-state-aware hint text for one measurement card — handles "never recorded", "no previous
// record yet" (single-record state), and "recorded before but not on the previous entry" as
// distinct cases rather than collapsing them all into a blank/"—".
export function formatMeasurementHint(m) {
  if (m.latestValue == null) return undefined;
  if (!m.hasPrevious) return 'First recorded value';
  if (m.previousValue == null) return 'Not recorded last time';
  if (m.direction === 'same') return 'No change since last check-in';
  const arrow = m.direction === 'down' ? '↓' : '↑';
  return `${arrow} ${Math.abs(m.delta).toFixed(1)} ${m.unit} since last check-in`;
}

export function computeProgressStats(entries) {
  if (!entries?.length) return null;
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = sorted[sorted.length - 1];
  const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
  const first = sorted[0];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return {
    sorted,
    latest,
    previous,
    measurements: PROGRESS_MEASUREMENTS.map((field) => measurementChange(field, latest, previous, Boolean(previous))),
    weightChangeTotal: latest.weight - first.weight,
    weightChangeRecent: previous ? latest.weight - previous.weight : 0,
    energyChangeRecent: previous && latest.energy != null && previous.energy != null ? latest.energy - previous.energy : null,
    checkInsLast30Days: sorted.filter((entry) => new Date(entry.date).getTime() >= thirtyDaysAgo).length,
  };
}
