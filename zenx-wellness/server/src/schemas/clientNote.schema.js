import { z } from 'zod';

export const createClientNoteSchema = z.object({
  client: z.string().min(1),
  body: z.string().trim().min(1, 'Note cannot be empty'),
});

export const updateClientNoteSchema = z.object({
  body: z.string().trim().min(1, 'Note cannot be empty'),
});
