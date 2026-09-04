import { z } from 'zod'

export const createRoleSchema = z.object({
  name: z.string().trim().min(2, { error: 'Role name is required' }).max(100),
  description: z.string().trim().max(255).optional(),
  permissions: z.array(z.string().trim()).default([]),
})

export const updateRoleSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(255).nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, { error: 'Provide at least one field to update' })

export const setPermissionsSchema = z.object({
  permissions: z.array(z.string().trim()),
})

export const roleActiveSchema = z.object({ isActive: z.boolean() })
