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

export function formatCalendarDate(value, opts) {
  const ymd = toCalendarDate(value);
  if (!ymd) return '';
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    ...(opts ?? { day: 'numeric', month: 'short', year: 'numeric' }),
    timeZone: 'UTC',
  });
}
