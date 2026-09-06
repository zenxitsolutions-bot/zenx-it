import { z } from 'zod';

const measurement = z.number().positive().optional();

export const createProgressSchema = z.object({
  date: z.coerce.date(),
  weight: z.number(),
  waist: measurement,
  hip: measurement,
  thigh: measurement,
  upperArm: measurement,
  energy: z.number().min(0).max(10).optional(),
  adherence: z.number().min(0).max(100).optional(),
});

export const updateProgressSchema = createProgressSchema.partial();
