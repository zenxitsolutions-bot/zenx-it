// `timeZone` is a separate trailing argument, not merged into `opts` — `opts` is a full-replace of
// the date/time fields shown (existing call sites rely on that: e.g. passing
// { weekday: 'long', day: 'numeric', month: 'short' } to deliberately omit `year`), so folding a
// `timeZone` key into the same object would either clobber a caller's field selection or need a
// merge that changes what today's 21+ call sites render. Omitting `timeZone` (every existing call
// site) reproduces today's exact browser-local behavior — this is a purely additive extension.
export function formatDate(value, opts, timeZone) {
  const base = opts ?? { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(value).toLocaleDateString('en-US', timeZone ? { ...base, timeZone } : base);
}

export function formatTime(value, timeZone) {
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', ...(timeZone ? { timeZone } : {}) });
}

export function formatDateTime(value, timeZone) {
  return `${formatDate(value, undefined, timeZone)} · ${formatTime(value, timeZone)}`;
}

// For seeding a <input type="datetime-local"> value from a Date/ISO string, in local time.
export function toDatetimeLocalValue(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
