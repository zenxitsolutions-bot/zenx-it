import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  // The company slug from the URL the login form was served on (/:companySlug/login). Absent on
  // the bare /login, which stays company-agnostic. This is a *slug*, never a company id — the
  // controller resolves it against the companies table itself, so a client cannot name a tenant
  // it doesn't belong to by editing the request body.
  companySlug: z.string().min(1).max(255).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const handoffSchema = z.object({
  token: z.string().min(1),
});
