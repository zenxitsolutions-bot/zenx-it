import { z } from 'zod';
import { optionalIanaTimezone, countryCode, dateFormat, timeFormat } from './timezone.schema.js';

const ROLE = ['Super Admin', 'Admin', 'Sales', 'Support'];

export const inviteAdminUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(ROLE),
});

// patchAdminUser forwards req.body straight to models/Profile.js#updateProfile with no key
// renaming — so these four use the same snake_case names as the `profiles` columns themselves
// (Profile.js's own "field names kept snake_case end-to-end" convention), not camelCase like the
// invite fields above.
export const patchAdminUserSchema = z.object({
  role: z.enum(ROLE).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  timezone: optionalIanaTimezone,
  country: countryCode,
  date_format: dateFormat,
  time_format: timeFormat,
});

// The self-service subset of patchAdminUserSchema — role/status are admin-managed only (see
// patchAdminUser/authorize()), never something a staff member sets on themselves. Same snake_case
// convention (this PATCH /auth/me route also forwards req.body straight to updateProfile).
export const updateMyProfileSchema = z.object({
  timezone: optionalIanaTimezone,
  country: countryCode,
  date_format: dateFormat,
  time_format: timeFormat,
});

export const setPasswordFromTokenSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});
