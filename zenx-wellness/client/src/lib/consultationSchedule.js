import { z } from 'zod';

// "Every 7 days" / "Every 14 days" / "Custom" — collapses to one frequencyDays integer server-side
// (see server/src/db/schema.sql's comment on consultation_schedules.frequency_days).
export const FREQUENCY_PRESETS = [
  { value: '7', label: 'Every 7 days' },
  { value: '14', label: 'Every 14 days' },
  { value: 'custom', label: 'Custom' },
];

export const consultationScheduleFormSchema = z
  .object({
    frequencyPreset: z.enum(['7', '14', 'custom']),
    customFrequencyDays: z.string().optional(),
    preferredWeekday: z.string().min(1, 'Required'),
    preferredTime: z.string().min(1, 'Required'),
    startDate: z.string().min(1, 'Required'),
    active: z.enum(['true', 'false']),
  })
  .refine((data) => data.frequencyPreset !== 'custom' || (data.customFrequencyDays && Number(data.customFrequencyDays) > 0), {
    message: 'Enter a number of days',
    path: ['customFrequencyDays'],
  });

export function defaultConsultationScheduleValues() {
  return {
    frequencyPreset: '7',
    customFrequencyDays: '',
    preferredWeekday: '1',
    preferredTime: '10:00',
    startDate: new Date().toISOString().slice(0, 10),
    active: 'true',
  };
}

// Server schedule shape -> local form values, for editing an existing one.
export function toFormValues(schedule) {
  if (!schedule) return defaultConsultationScheduleValues();
  const preset = schedule.frequencyDays === 7 || schedule.frequencyDays === 14 ? String(schedule.frequencyDays) : 'custom';
  return {
    frequencyPreset: preset,
    customFrequencyDays: preset === 'custom' ? String(schedule.frequencyDays) : '',
    preferredWeekday: String(schedule.preferredWeekday),
    preferredTime: schedule.preferredTime.slice(0, 5),
    startDate: schedule.startDate.slice(0, 10),
    active: schedule.active ? 'true' : 'false',
  };
}

// Local form values -> the API payload's schedule fields (the caller adds `client` and
// `regenerateFutureCalls`).
export function toApiPayload(values) {
  return {
    frequencyDays: values.frequencyPreset === 'custom' ? Number(values.customFrequencyDays) : Number(values.frequencyPreset),
    preferredWeekday: Number(values.preferredWeekday),
    preferredTime: values.preferredTime,
    startDate: values.startDate,
    active: values.active === 'true',
  };
}

// Whether a new payload actually changes anything an existing schedule already governs — used to
// decide whether editing needs to ask about affected future calls at all (a no-op re-save, e.g.
// just re-submitting the form, shouldn't trigger that prompt).
export function schedulePatternChanged(existing, payload) {
  if (!existing) return false;
  return (
    existing.frequencyDays !== payload.frequencyDays ||
    existing.preferredWeekday !== payload.preferredWeekday ||
    existing.preferredTime.slice(0, 5) !== payload.preferredTime.slice(0, 5) ||
    existing.startDate.slice(0, 10) !== payload.startDate.slice(0, 10) ||
    existing.active !== payload.active
  );
}
