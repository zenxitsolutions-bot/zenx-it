import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .min(1, { error: 'Email is required' })
    .pipe(z.email({ error: 'Enter a valid email address' }))
    .transform((value) => value.toLowerCase()),
  password: z
    .string({ error: 'Password is required' })
    .min(1, { error: 'Password is required' }),
  rememberMe: z.boolean().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .min(1, { error: 'Email is required' })
    .pipe(z.email({ error: 'Enter a valid email address' }))
    .transform((value) => value.toLowerCase()),
})

// 64 random bytes, hex-encoded — anything else never existed as a ticket.
const resetToken = z
  .string({ error: 'Reset token is required' })
  .trim()
  .regex(/^[a-f0-9]{64}$/i, { error: 'This reset link is invalid or has expired' })

export const resetPasswordSchema = z
  .object({
    token: resetToken,
    password: z
      .string({ error: 'Password is required' })
      .min(8, { error: 'Use at least 8 characters' })
      .max(128, { error: 'Use at most 128 characters' })
      .regex(/[a-z]/, { error: 'Include at least one lowercase letter' })
      .regex(/[A-Z]/, { error: 'Include at least one uppercase letter' })
      .regex(/[0-9]/, { error: 'Include at least one number' }),
    confirmPassword: z.string({ error: 'Confirm your new password' }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Passwords do not match',
  })

export const resetTokenQuerySchema = z.object({ token: resetToken })
