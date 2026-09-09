// Read-model helpers for the client portal screens (Overview/Meals/Progress/Calls) — kept out of
// components per CLAUDE.md §3 ("no business logic in components").
import { addCalendarDays, dateForMealDay, planRangeDates, planWeekDays, toCalendarDate, toLocalCalendarDate, weekdayNameFromYmd } from './calendarDate';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function getTodayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

export { planWeekDays, weekdayNameFromYmd } from './calendarDate';

// Stored meal.day is a positional slot (Monday = day 0 of THIS plan). Map it to the civil
// weekday that slot falls on so a Wednesday-start week keys meals as Wed…Tue.
export function civilDayForMeal(weekStart, storedDay) {
  const days = planWeekDays(weekStart);
  const offset = WEEKDAYS.indexOf(storedDay);
  return offset >= 0 ? days[offset] : storedDay;
}

// Civil weekday of `date` when it sits inside this plan's 7-day window (Wed-start → first
// key is Wednesday). Null if `date` is outside the window.
export function getDayKeyForDate(weekStart, date = new Date(), weekEnd) {
  if (!weekStart) return null;
  const start = toCalendarDate(weekStart);
  if (!start) return null;
  const ymd = toLocalCalendarDate(date);
  const end = toCalendarDate(weekEnd) || addCalendarDays(start, 6);
  return ymd >= start && ymd <= end ? ymd : null;
}

// Exported so client/src/lib/clientProfile.js's meal-history sort can reuse the exact same
// "8:00 AM"-style parsing instead of a second, potentially-drifting implementation.
export function parseTimeToMinutes(time) {
  const [clock, meridiem] = String(time).trim().split(/\s+/);
  let [hours, minutes] = clock.split(':').map(Number);
  const period = (meridiem ?? '').toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + (minutes || 0);
}

export function groupMealsByDay(plan) {
  const dates = planRangeDates(plan?.week, plan?.weekEnd);
  const map = Object.fromEntries(dates.map((date) => [date, []]));
  for (const meal of plan?.meals ?? []) {
    const date = dateForMealDay(plan?.week, meal.day);
    if (!date) continue;
    (map[date] ??= []).push(meal);
  }
  for (const day of Object.keys(map)) {
    map[day].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  }
  return map;
}

// The next meal that is still upcoming from `now` — later today, or the next day in this plan
// if tonight is done. A 7:00 AM slot must not stay "up next" at 10pm just because it wasn't ticked.
export function getTodayHighlightMeal(plan, now = new Date()) {
  const start = toCalendarDate(plan?.week);
  if (!start) return null;

  const today = toLocalCalendarDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const upcoming = [];

  for (const meal of plan.meals ?? []) {
    if (meal.completed) continue;
    const date = dateForMealDay(start, meal.day);
    if (!date) continue;
    const end = toCalendarDate(plan.weekEnd) || addCalendarDays(start, 6);
    if (date > end) continue;
    const minutes = parseTimeToMinutes(meal.time);
    if (date < today || (date === today && minutes < nowMinutes)) continue;
    upcoming.push({ meal, date, minutes });
  }

  upcoming.sort((a, b) => (a.date === b.date ? a.minutes - b.minutes : a.date.localeCompare(b.date)));
  return upcoming[0] ?? null;
}

export function upcomingMealWhenLabel(date, now = new Date()) {
  if (!date) return null;
  const today = toLocalCalendarDate(now);
  if (date === today) return null;
  if (date === addCalendarDays(today, 1)) return 'Tomorrow';
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

export function computeMealCompletion(plan) {
  const meals = plan?.meals ?? [];
  return { completed: meals.filter((meal) => meal.completed).length, total: meals.length };
}

function planCoversDate(plan, today) {
  const start = toCalendarDate(plan?.week);
  if (!start) return false;
  const end = toCalendarDate(plan.weekEnd) || addCalendarDays(start, 6);
  return today >= start && today <= end;
}

function planRecency(plan) {
  const time = new Date(plan?.updatedAt ?? plan?.updated_at ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function newestPlan(plans) {
  return [...plans].sort((a, b) => planRecency(b) - planRecency(a))[0] ?? null;
}

// Prefer the covering plan the dietitian updated most recently. An older published week that
// still overlaps today must not hide a swap that was just saved on a newer plan.
export function pickCurrentPlan(plans, today = toLocalCalendarDate()) {
  const list = Array.isArray(plans) ? plans : [];
  const covering = list.filter((p) => planCoversDate(p, today));
  return (
    newestPlan(covering.filter((p) => p.published)) ||
    newestPlan(covering) ||
    newestPlan(list.filter((p) => p.published)) ||
    newestPlan(list)
  );
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

function refId(value) {
  return value?._id ?? value ?? null;
}

// personKey is 'dietitian' (admin page: host / dietitian) or 'client' (dietitian page).
// from/to are YYYY-MM-DD civil days in the viewer's local calendar, inclusive.
export function filterCalls(calls, { personId, personKey = 'dietitian', from, to } = {}) {
  return (calls ?? []).filter((call) => {
    if (personId && refId(call[personKey]) !== personId) return false;
    const ymd = toLocalCalendarDate(new Date(call.scheduledAt));
    if (from && ymd < from) return false;
    if (to && ymd > to) return false;
    return true;
  });
}

/**
 * The four buckets behind the calls screens' tabs. Derived from the same two facts `splitCalls`
 * uses — `status` and whether `scheduledAt` has passed — so a call can never appear under one
 * heading here and a contradictory one there.
 *
 *   all        every call, newest activity first
 *   upcoming   still scheduled and still in the future
 *   finished   completed, plus scheduled calls whose time has passed (nobody marked them done,
 *              but they are not "upcoming" either — leaving them out entirely is how calls used
 *              to silently vanish from both sections)
 *   cancelled  explicitly cancelled
 *
 * `upcoming` sorts soonest-first (the next thing you must act on); every other bucket sorts
 * most-recent-first, because there the useful end is what just happened.
 */
export const CALL_TABS = [
  { id: 'all', label: 'Total calls' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'finished', label: 'Finished' },
  { id: 'cancelled', label: 'Cancelled' },
];

export function groupCallsByTab(calls) {
  const now = Date.now();
  const all = [...(calls ?? [])];
  const upcoming = [];
  const finished = [];
  const cancelled = [];

  for (const call of all) {
    if (call.status === 'cancelled') cancelled.push(call);
    else if (call.status === 'completed') finished.push(call);
    else if (new Date(call.scheduledAt).getTime() >= now) upcoming.push(call);
    else finished.push(call); // scheduled, but the slot has already passed
  }

  const soonestFirst = (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt);
  const latestFirst = (a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt);

  upcoming.sort(soonestFirst);
  finished.sort(latestFirst);
  cancelled.sort(latestFirst);
  all.sort(latestFirst);

  return { all, upcoming, finished, cancelled };
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

export function recipeIngredientList(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  if (/\r?\n/.test(raw)) return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return raw.split(',').map((item) => item.replace(/\.$/, '').trim()).filter(Boolean);
}

export function recipeInstructionSteps(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  const lines = /\r?\n/.test(raw) ? raw.split(/\r?\n/) : [raw];
  return lines.map((step) => step.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean);
}
