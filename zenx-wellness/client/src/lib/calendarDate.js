// Calendar dates (plan week start/end) are civil days, not instants. `new Date("YYYY-MM-DD")` is
// UTC midnight per ISO 8601, so formatting in the browser's local zone moves the day (e.g. a
// US-timezone client can show the previous evening). Keep the YYYY-MM-DD digits and format them
// as UTC calendar parts so the dietitian's pick and the client's view stay the same day.

const YMD = /^(\d{4}-\d{2}-\d{2})/;

export function toLocalCalendarDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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

const WEEKDAY_FROM_SUNDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function weekdayNameFromYmd(ymd) {
  const date = toCalendarDate(ymd);
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  return WEEKDAY_FROM_SUNDAY[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

const WEEKDAY_SLOTS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MAX_PLAN_DAYS = 90;

// Civil weekdays in plan order — Wednesday-start → Wed…Tue, not a fixed Mon–Sun strip.
export function planWeekDays(weekStart) {
  const start = toCalendarDate(weekStart);
  if (!start) return WEEKDAY_SLOTS;
  return Array.from({ length: 7 }, (_, index) => weekdayNameFromYmd(addCalendarDays(start, index)));
}

export function planRangeDates(weekStart, weekEnd) {
  const start = toCalendarDate(weekStart);
  if (!start) return [];
  const end = toCalendarDate(weekEnd) || addCalendarDays(start, 6);
  const last = end < start ? start : end;
  const dates = [];
  let cursor = start;
  while (dates.length < MAX_PLAN_DAYS && cursor <= last) {
    dates.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return dates;
}

export function dateForMealDay(weekStart, day) {
  const start = toCalendarDate(weekStart);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  if (!start) return null;
  const slotOffset = WEEKDAY_SLOTS.indexOf(day);
  if (slotOffset >= 0) return addCalendarDays(start, slotOffset);
  const civilOffset = planWeekDays(start).indexOf(day);
  return civilOffset >= 0 ? addCalendarDays(start, civilOffset) : null;
}

export function planDayOptions(weekStart, weekEnd) {
  return planRangeDates(weekStart, weekEnd).map((ymd, index) => ({
    value: index < 7 ? WEEKDAY_SLOTS[index] : ymd,
    ymd,
  }));
}

export function dayValueForDate(weekStart, weekEnd, ymd) {
  return planDayOptions(weekStart, weekEnd).find((option) => option.ymd === ymd)?.value ?? ymd;
}

export function formatCalendarDate(value, opts) {
  const ymd = toCalendarDate(value);
  if (!ymd) return '';
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    ...(opts ?? { day: 'numeric', month: 'short', year: 'numeric' }),
    timeZone: 'UTC',
  });
}
