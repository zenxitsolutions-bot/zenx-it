import { z } from 'zod'
import { uuid } from '../common.validator.js'

export const createSubscriptionSchema = z
  .object({
    companyId: uuid,
    planId: uuid,
    startDate: z.coerce.date({ error: 'Enter a valid start date' }),
    endDate: z.coerce.date({ error: 'Enter a valid end date' }),
    status: z.enum(['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED']).optional(),
  })
  .refine((value) => value.endDate > value.startDate, {
    error: 'End date must be after the start date',
    path: ['endDate'],
  })

export const updateSubscriptionSchema = z
  .object({
    planId: uuid.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Provide at least one field to update',
  })
