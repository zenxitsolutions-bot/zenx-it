import { z } from 'zod';
import { ianaTimezone, optionalIanaTimezone } from './timezone.schema.js';

const CONTACT_METHOD = ['Phone Call', 'Email', 'WhatsApp', 'Meeting', 'Video Call', 'Other'];
const REMINDER = ['None', '15 minutes before', '30 minutes before', '1 hour before', '1 day before'];
const STATUS = ['SCHEDULED', 'COMPLETED', 'OVERDUE', 'RESCHEDULED', 'CANCELLED'];

export const createFollowupSchema = z.object({
  enquiryId: z.string().min(1),
  assignedTo: z.string().optional().nullable(),
  scheduledDate: z.string().min(1),
  scheduledTime: z.string().min(1),
  // Required (not optional/defaulted) — unlike the migration backfill's flagged 'UTC' placeholder
  // for historical rows, a NEW follow-up should always carry a real, deliberately chosen zone
  // (FollowupScheduleFields.tsx auto-fills the browser's own zone, but never silently on the
  // server). See the timezone column comment in schema.sql.
  timezone: ianaTimezone,
  contactMethod: z.enum(CONTACT_METHOD),
  notes: z.string().optional().nullable(),
  reminder: z.enum(REMINDER).optional(),
});

export const patchFollowupSchema = z.object({
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  timezone: optionalIanaTimezone,
  contactMethod: z.enum(CONTACT_METHOD).optional(),
  notes: z.string().optional().nullable(),
  reminder: z.enum(REMINDER).optional(),
  status: z.enum(STATUS).optional(),
  completedAt: z.string().optional().nullable(),
});
