import { z } from 'zod';

export const addReportFeedbackSchema = z.object({
  message: z.string().min(1),
  status: z.enum(['pending', 'reviewed']).default('reviewed'),
});
