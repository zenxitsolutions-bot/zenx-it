import { z } from 'zod';

export const getConsultationScheduleQuerySchema = z.object({
  client: z.string().min(1),
});

// frequencyDays capped at 90 — a bound against an absurd value, not a meaningful business rule; the
// three UI presets (7/14/custom N) all collapse to this one field, see schema.sql's own comment.
export const saveConsultationScheduleSchema = z.object({
  client: z.string().min(1),
  frequencyDays: z.coerce.number().int().min(1).max(90),
  preferredWeekday: z.coerce.number().int().min(0).max(6),
  preferredTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Expected HH:MM'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  active: z.boolean(),
  // Whether to cancel+regenerate this schedule's future generated calls to match the new settings —
  // omitted/false means "just save the config, leave already-booked future calls alone." Ignored on
  // a brand-new schedule (there's nothing yet to regenerate; the first batch always generates).
  regenerateFutureCalls: z.boolean().optional(),
});
