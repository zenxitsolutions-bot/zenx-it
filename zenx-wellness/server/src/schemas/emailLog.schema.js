import { z } from 'zod';

export const listEmailLogsQuerySchema = z.object({
  status: z.enum(['queued', 'sending', 'sent', 'failed']).optional(),
});
