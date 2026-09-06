// Shared by the booking dialogs (client + dietitian) and useCallReminders — reminder options for
// the in-app pop-up reminder feature.

export const CALL_REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '10', label: '10 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
];

// Pre-selected in both booking dialogs, and mirrors DEFAULT_REMINDER_MINUTES_BEFORE in
// server/src/services/callService.js — the server applies the same 15 minutes to calls booked
// through paths that have no dialog at all (consultation-schedule generation, enquiry follow-ups).
// Keep the two in step: a mismatch means the reminder a user sees selected is not the one they get.
export const DEFAULT_CALL_REMINDER_VALUE = '15';

// react-hook-form fields are always strings — these convert to/from the API's
// number-or-null `reminderMinutesBefore`.
export function reminderValueToMinutes(value) {
  return value === 'none' || !value ? null : Number(value);
}

export function reminderMinutesToValue(minutes) {
  return minutes === null || minutes === undefined ? 'none' : String(minutes);
}
