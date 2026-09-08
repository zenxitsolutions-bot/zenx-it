// Calendar dates (plan week start/end, progress.date) are civil days, not instants. Parsing them
// through JS Date / ISO timestamps shifts the day in any timezone that isn't UTC — the same class
// of bug Progress.js documents on DATE_FORMAT. Keep the YYYY-MM-DD digits unchanged.

const YMD = /^(\d{4}-\d{2}-\d{2})/;

export function todayCalendarDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toCalendarDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const match = value.match(YMD);
    if (match) return match[1];
  }
  return null;
}

export function addCalendarDays(ymd, days) {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// Plan meals store WEEKDAYS positional keys (Monday = slot 0), not the civil weekday of week start.
const WEEKDAY_SLOTS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAY_FROM_SUNDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function weekdayNameFromYmd(ymd) {
  const date = toCalendarDate(ymd);
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  return WEEKDAY_FROM_SUNDAY[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export function planWeekDays(weekStart) {
  const start = toCalendarDate(weekStart);
  if (!start) return WEEKDAY_SLOTS;
  return Array.from({ length: 7 }, (_, index) => weekdayNameFromYmd(addCalendarDays(start, index)));
}

export function dateForWeekdaySlot(week, day) {
  const start = toCalendarDate(week);
  if (!start) return null;
  const slotOffset = WEEKDAY_SLOTS.indexOf(day);
  if (slotOffset >= 0) return addCalendarDays(start, slotOffset);
  // Already a civil weekday on a mid-week plan (e.g. "Wednesday" when the week starts Wednesday).
  const civilOffset = planWeekDays(start).indexOf(day);
  return civilOffset >= 0 ? addCalendarDays(start, civilOffset) : null;
}

export function formatCalendarDate(value, pattern = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const ymd = toCalendarDate(value);
  if (!ymd) return '';
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { ...pattern, timeZone: 'UTC' });
}
