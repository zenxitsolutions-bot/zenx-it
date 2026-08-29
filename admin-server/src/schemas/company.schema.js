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
