// Shared by the booking dialogs (client + dietitian) and useCallReminders — reminder options for
// the in-app pop-up reminder feature.

export const CALL_REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '10', label: '10 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
];

// react-hook-form fields are always strings — these convert to/from the API's
// number-or-null `reminderMinutesBefore`.
export function reminderValueToMinutes(value) {
  return value === 'none' || !value ? null : Number(value);
}

export function reminderMinutesToValue(minutes) {
  return minutes === null || minutes === undefined ? 'none' : String(minutes);
}
