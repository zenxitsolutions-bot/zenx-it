import { z } from 'zod';

export const createReportSchema = z.object({
  note: z.string().trim().max(4000).refine((value) => Buffer.byteLength(value, 'utf8') <= 4000, 'Keep the note under 4,000 bytes.').optional(),
}).strict();

export const addReportFeedbackSchema = z.object({
  message: z.string().trim().min(1).max(10000),
  status: z.enum(['pending', 'reviewed']).default('reviewed'),
});
