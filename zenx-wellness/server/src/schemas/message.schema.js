import { z } from 'zod';

export const createMessageSchema = z.object({
  // A dietitian must say which client; a client never sends this — the server derives the
  // conversation from their own assignedDietitian (see message.controller.js#resolveConversation).
  client: z.string().min(1).optional(),
  body: z.string().trim().min(1, 'Message cannot be empty').max(4000),
});

export const markReadSchema = z.object({
  client: z.string().min(1).optional(),
});
