import { z } from 'zod';

export const createSupportMessageSchema = z.object({
  dietitian: z.string().min(1).optional(),
  body: z.string().trim().min(1, 'Message cannot be empty').max(4000),
});

export const markSupportReadSchema = z.object({
  dietitian: z.string().min(1).optional(),
});
