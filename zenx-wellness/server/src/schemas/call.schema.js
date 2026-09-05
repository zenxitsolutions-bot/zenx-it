import { z } from 'zod';

// reminderMinutesBefore drives the client's in-app pop-up reminder — null/0 means no reminder.
const reminderMinutesBefore = z.coerce.number().int().min(0).max(1440).nullable().optional();
// Bypasses the availability check (working hours / blocks / overlap — see
// server/src/services/availabilityGuard.js) for a genuine exception, e.g. an emergency call
// outside hours. call.controller.js only honors this for a dietitian/admin caller — a client can
// never force, regardless of what they send here.
const force = z.boolean().optional();

export const createCallSchema = z.object({
  // A client booking their own call sends neither — the server derives both from the caller's
  // assignedDietitian. A dietitian/admin booking on someone's behalf must supply both.
  client: z.string().min(1).optional(),
  dietitian: z.string().min(1).optional(),
  scheduledAt: z.coerce.date(),
  notes: z.string().optional(),
  reminderMinutesBefore,
  force,
});

export const updateCallSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
  reminderMinutesBefore,
  force,
});

// GET /calls/available-slots — date is a plain YYYY-MM-DD in `timezone` (the viewer's IANA zone).
// When timezone is omitted the server uses the dietitian's saved zone. dietitian is required for
// an admin caller, ignored/derived for client and dietitian callers.
export const availableSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  dietitian: z.string().min(1).optional(),
  excludeCallId: z.string().min(1).optional(),
  timezone: z.string().min(1).max(64).optional(),
});
