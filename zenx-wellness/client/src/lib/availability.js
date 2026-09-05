// Shared by WeeklyHoursForm / AvailabilityExceptionList / AvailabilityExceptionFormDialog.

// Monday-first display order mapping to the server's 0=Sunday..6=Saturday (matches
// server/src/services/availability.js / JS Date#getUTCDay()).
export const WEEKDAY_ORDER = [
  { weekday: 1, label: 'Monday' },
  { weekday: 2, label: 'Tuesday' },
  { weekday: 3, label: 'Wednesday' },
  { weekday: 4, label: 'Thursday' },
  { weekday: 5, label: 'Friday' },
  { weekday: 6, label: 'Saturday' },
  { weekday: 0, label: 'Sunday' },
];

// Deliberately duplicated from server/src/services/availability.js#CALL_DURATION_MINUTES — this
// monorepo has no package shared between client/ and server/, and CLAUDE.md §3 prefers a small
// duplication over inventing cross-boundary sharing for one primitive.
export const CALL_DURATION_MINUTES = 30;

export const EXCEPTION_KIND_OPTIONS = [
  { value: 'closed', label: 'Blocked' },
  { value: 'open', label: 'Extra hours' },
];

export function describeExceptionKind(kind) {
  return EXCEPTION_KIND_OPTIONS.find((opt) => opt.value === kind)?.label ?? kind;
}
