import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'Email is required' })
    .pipe(z.email({ error: 'Enter a valid email address' })),
  password: z.string().min(1, { error: 'Password is required' }),
  rememberMe: z.boolean().optional(),
})

/** Flattens Zod issues into a { field: message } map the form can render inline. */
export const collectFieldErrors = (zodError) => {
  const errors = {}
  for (const issue of zodError.issues) {
    const field = issue.path.join('.') || 'form'
    if (!errors[field]) errors[field] = issue.message
  }
  return errors
}

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'Email is required' })
    .pipe(z.email({ error: 'Enter a valid email address' })),
})

// Mirrors the server's rules so the user sees the problem before a round trip.
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { error: 'Use at least 8 characters' })
      .max(128, { error: 'Use at most 128 characters' })
      .regex(/[a-z]/, { error: 'Include at least one lowercase letter' })
      .regex(/[A-Z]/, { error: 'Include at least one uppercase letter' })
      .regex(/[0-9]/, { error: 'Include at least one number' }),
    confirmPassword: z.string().min(1, { error: 'Confirm your new password' }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Passwords do not match',
  })
