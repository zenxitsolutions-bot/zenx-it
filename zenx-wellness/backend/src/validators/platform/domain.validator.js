import { z } from 'zod'
import { isValidSubdomain } from '../../utils/subdomain.js'

export const createDomainSchema = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isValidSubdomain, { error: 'Subdomain must be 3-63 characters, letters, digits and hyphens' }),
  isPrimary: z.boolean().optional(),
})

export const updateDomainSchema = z
  .object({
    isPrimary: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Provide at least one field to update',
  })
