import { z } from 'zod'
import { emailSchema, phoneSchema, timezoneSchema, uuid } from '../common.validator.js'

const ASSIGNABLE_ROLES = ['COMPANY_ADMIN', 'MANAGER', 'DIETITIAN', 'TRAINER', 'RECEPTIONIST', 'CLIENT']

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, { error: 'First name is required' }).max(100),
  lastName: z.string().trim().min(1, { error: 'Last name is required' }).max(100),
  email: emailSchema,
  username: z
    .string()
    .trim()
    .min(3, { error: 'Username must be at least 3 characters' })
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/, { error: 'Username may use letters, digits, dot, underscore, hyphen' })
    .optional(),
  phone: phoneSchema.optional(),
  // SUPER_ADMIN is deliberately absent: a tenant can never mint platform staff.
  role: z.enum(ASSIGNABLE_ROLES, { error: 'Choose a valid role' }),
  timezone: timezoneSchema.optional(),
  roleIds: z.array(uuid).default([]),
})

export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: emailSchema.optional(),
    username: z.string().trim().min(3).max(100).regex(/^[a-zA-Z0-9._-]+$/).optional(),
    phone: phoneSchema.nullish(),
    role: z.enum(ASSIGNABLE_ROLES).optional(),
    timezone: timezoneSchema.nullish(),
    roleIds: z.array(uuid).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { error: 'Provide at least one field to update' })

export const userStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED'], { error: 'Choose a valid status' }),
})

export const assignRolesSchema = z.object({ roleIds: z.array(uuid) })

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  role: z.enum(ASSIGNABLE_ROLES).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
})
