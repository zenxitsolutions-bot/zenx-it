// `timeZone` is a separate trailing argument, not merged into any options object — omitting it
// (every existing call site) reproduces today's exact browser-local behavior, so this is a purely
// additive extension. Mirrors wellness-app's own client/src/lib/format.js#formatDate design.
export function formatDate(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
}

export function formatDateShort(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(timeZone ? { timeZone } : {}) });
}

export function formatTime(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", ...(timeZone ? { timeZone } : {}) });
}

export function formatDateTime(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return "—";
  return `${formatDate(iso, timeZone)} · ${formatTime(iso, timeZone)}`;
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 1) return "just now";
  if (Math.abs(diffMin) < 60) return diffMin > 0 ? `${diffMin}m ago` : `in ${-diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return diffHr > 0 ? `${diffHr}h ago` : `in ${-diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  return diffDay > 0 ? `${diffDay}d ago` : `in ${-diffDay}d`;
}

/** Combine a YYYY-MM-DD date and HH:MM time into a Date for comparisons. */
export function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time || "00:00"}:00`);
}

/**
 * A followup row's real UTC instant. Every followup created since the timezone rollout carries
 * scheduled_at_utc from the server (see admin-server/src/models/Followup.js) — this is now the
 * ONLY correct way to get a followup's instant; scheduled_date+scheduled_time are the original
 * wall-clock the creator typed, kept for display/audit but no longer combined client-side
 * (that combineDateTime(date, time) pattern is what produced the "Invalid Date"/misordering bug
 * this rollout fixed once scheduled_date started round-tripping as a full ISO datetime string).
 */
export function followupInstant(followup: { scheduled_at_utc?: string | null; scheduled_date: string; scheduled_time: string }): Date {
  return followup.scheduled_at_utc ? new Date(followup.scheduled_at_utc) : combineDateTime(followup.scheduled_date, followup.scheduled_time);
}

export function isOverdue(date: string, time: string): boolean {
  return combineDateTime(date, time).getTime() < Date.now();
}

export function isToday(date: string): boolean {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// Same as isToday, but timezone-aware — compares calendar dates as they appear IN `timezone`
// rather than the browser's own zone. Use this for any UTC-instant field (e.g. enquiries/followups'
// created_at) being bucketed against "today" for a specific viewer — analytics.ts's
// computeTodaySummary previously compared a UTC-sliced date string against browser-local "today",
// which could misbucket a record near a UTC/local day boundary.
export function isTodayInZone(isoInstant: string, timezone: string): boolean {
  const dateKeyInZone = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d); // en-CA -> YYYY-MM-DD
  return dateKeyInZone(new Date(isoInstant)) === dateKeyInZone(new Date());
}

// Same idea for month-bucketing (analytics.ts's computeMonthlySeries) — "YYYY-MM" as it appears in
// `timezone`, not sliced from the raw UTC ISO string.
export function monthKeyInZone(isoInstant: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).format(new Date(isoInstant)).slice(0, 7);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short" });
}

/** ISO datetime `daysOffset` days from now (negative = past), at the given local hour/minute. */
export function offsetIso(daysOffset: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function offsetDateOnly(daysOffset: number): string {
  return offsetIso(daysOffset).slice(0, 10);
}

export function offsetTimeOnly(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
