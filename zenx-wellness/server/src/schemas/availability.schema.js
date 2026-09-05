import { z } from 'zod';

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Expected HH:MM (24-hour)');

const weeklyHoursDay = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
  })
  .refine((day) => day.startTime < day.endTime, { message: 'endTime must be after startTime', path: ['endTime'] });

// Whole-template replace (see DietitianWeeklyHours.js#replaceWeeklyHours) — a PUT, not a per-day
// PATCH, so the payload is the full set of open weekdays. `dietitian` is only meaningful (and
// only read) for an admin caller — availability.controller.js#resolveDietitianId ignores it for a
// dietitian caller, who can only ever mean themselves.
export const weeklyHoursSchema = z
  .object({ days: z.array(weeklyHoursDay).max(7), dietitian: z.string().min(1).optional() })
  .refine((body) => new Set(body.days.map((day) => day.weekday)).size === body.days.length, {
    message: 'Each weekday can appear only once',
    path: ['days'],
  });

export const createExceptionSchema = z
  .object({
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    kind: z.enum(['closed', 'open']),
    note: z.string().max(255).optional(),
  })
  .refine((body) => body.endAt > body.startAt, { message: 'endAt must be after startAt', path: ['endAt'] });
