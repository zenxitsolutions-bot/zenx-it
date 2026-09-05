// Calendar dates (plan week start/end, progress.date) are civil days, not instants. Parsing them
// through JS Date / ISO timestamps shifts the day in any timezone that isn't UTC — the same class
// of bug Progress.js documents on DATE_FORMAT. Keep the YYYY-MM-DD digits unchanged.

const YMD = /^(\d{4}-\d{2}-\d{2})/;

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

export function formatCalendarDate(value, pattern = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const ymd = toCalendarDate(value);
  if (!ymd) return '';
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { ...pattern, timeZone: 'UTC' });
}
