import { z } from 'zod'
import { emailSchema, phoneSchema, timezoneSchema, uuid } from '../common.validator.js'
import { isValidSubdomain } from '../../utils/subdomain.js'

const companyCore = {
  name: z.string().trim().min(2, { error: 'Company name is required' }).max(150),
  logoUrl: z.url({ error: 'Logo must be a valid URL' }).max(500).optional(),
  email: emailSchema,
  phone: phoneSchema.optional(),
  address: z.string().trim().max(1000).optional(),
  country: z.string().trim().min(2, { error: 'Country is required' }).max(100),
  timezone: timezoneSchema,
}

export const subscriptionWindow = {
  planId: uuid,
  subStartDate: z.coerce.date({ error: 'Enter a valid subscription start date' }),
  subEndDate: z.coerce.date({ error: 'Enter a valid subscription end date' }),
}

export const companyAdminSchema = z.object({
  firstName: z.string().trim().min(1, { error: 'First name is required' }).max(100),
  lastName: z.string().trim().min(1, { error: 'Last name is required' }).max(100),
  email: emailSchema,
  phone: phoneSchema.optional(),
  username: z
    .string()
    .trim()
    .min(3, { error: 'Username must be at least 3 characters' })
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/, { error: 'Username may use letters, digits, dot, underscore, hyphen' }),
})

export const createCompanySchema = z
  .object({
    ...companyCore,
    ...subscriptionWindow,
    // Optional override; otherwise derived from the company name.
    subdomain: z
      .string()
      .trim()
      .toLowerCase()
      .refine(isValidSubdomain, { error: 'Subdomain must be 3-63 characters, letters, digits and hyphens' })
      .optional(),
    admin: companyAdminSchema,
  })
  .refine((value) => value.subEndDate > value.subStartDate, {
    error: 'Subscription end date must be after the start date',
    path: ['subEndDate'],
  })

export const updateCompanySchema = z
  .object(companyCore)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: 'Provide at least one field to update',
  })

export const companyStatusSchema = z.object({
  accountStatus: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], {
    error: 'Status must be ACTIVE, INACTIVE or SUSPENDED',
  }),
})
