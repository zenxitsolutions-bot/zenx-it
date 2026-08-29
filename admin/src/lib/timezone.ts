import { fromZonedTime } from "date-fns-tz";

// TypeScript port of wellness-app's own client/src/lib/timezone.js (independent implementation —
// these two apps are deliberately separate deployments, see WellnessDb.js's own mirror-not-share
// convention). Every timezone-touching call site in this app should import from here rather than
// hand-rolling a second copy of these primitives.

// Cast, not a tsconfig lib bump to ES2022 — Intl.supportedValuesOf is ES2022, this project targets
// ES2020 (tsconfig.app.json); feature-detecting at runtime and typing the lookup locally avoids
// changing the project's compile target for one API (see CLAUDE.md's "ask before deviating" rule).
const IntlWithSupportedValues = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };

// Full IANA list when the runtime supports it (all evergreen browsers + Node 18+).
export const TIMEZONES: string[] = typeof IntlWithSupportedValues.supportedValuesOf === "function" ? IntlWithSupportedValues.supportedValuesOf("timeZone") : [];

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// "GMT+5:30" — a universally-renderable offset label, since not every IANA zone has a short
// abbreviation in every locale's data, but every zone has a GMT offset.
export function timezoneOffsetLabel(timezone: string = browserTimezone(), date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

// Renders a real instant as a labelled wall-clock time in a specific zone — the primitive behind
// every "X will see: {time}" dual-timezone preview (FollowupScheduleFields.tsx).
export function formatInZone(value: string | Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}

// A wall-clock "YYYY-MM-DDTHH:mm" typed in `timezone` -> the real UTC instant it represents
// (DST-correct via date-fns-tz's fromZonedTime, matching admin-server's own
// timezoneService.js#wallClockToUtc so client-computed previews and server-computed storage agree).
export function zonedTimeToUtcIso(localDateTimeString: string, timezone: string): string {
  return fromZonedTime(localDateTimeString, timezone).toISOString();
}

export function isKnownTimezone(value: string): boolean {
  return TIMEZONES.length === 0 || TIMEZONES.includes(value);
}
