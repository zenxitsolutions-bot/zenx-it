import { z } from 'zod';

export const setCompanyStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const setApplicationAccessSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED']),
});

export const setCustomerPasswordSchema = z.object({
  password: z.string().min(8),
});

export const setWellnessDietitianSchema = z.object({
  dietitianId: z.string().min(1).nullable(),
});

const optionalText = z.string().max(255).optional().nullable();

export const updateCompanySchema = z.object({
  companyName: z.string().min(1).optional(),
  companyEmail: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  companyPhone: optionalText,
  website: z.string().max(1024).optional().nullable(),
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  subscriptionPlan: z.enum(['starter', 'growth', 'enterprise']).optional().nullable(),
  contact: z
    .object({
      userId: z.string().min(1),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: optionalText,
      jobTitle: optionalText,
    })
    .optional(),
});
