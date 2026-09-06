import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const customerLoginSchema = loginSchema.extend({
  // Slug from /:companySlug/login. Resolved server-side to company_id; never trusted as a tenant id.
  companySlug: z.string().min(1).max(255).optional().nullable(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const setNewPasswordSchema = z.object({
  password: z.string().min(8),
});
