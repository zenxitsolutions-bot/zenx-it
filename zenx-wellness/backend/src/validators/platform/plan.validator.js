import { z } from 'zod'

export const createPlanSchema = z.object({
  name: z.string().trim().min(2, { error: 'Plan name is required' }).max(100),
  description: z.string().trim().max(2000).optional(),
  // Free-form capability map, e.g. { "maxClients": 500, "workoutPlans": true }
  features: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().optional(),
})

export const updatePlanSchema = createPlanSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { error: 'Provide at least one field to update' },
)
