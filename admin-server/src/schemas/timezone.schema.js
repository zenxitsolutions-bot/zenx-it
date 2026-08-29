import { z } from 'zod';
import { isValidTimezone } from '../services/timezoneService.js';

// Must be a real IANA zone name — isValidTimezone (timezoneService.js) uses Intl.DateTimeFormat's
// own RangeError as the validity check, the standard way to validate one without a lookup table.
// Same pattern as wellness-app's own server/src/schemas/user.schema.js#timezone field.
export const ianaTimezone = z.string().min(1).refine(isValidTimezone, { message: 'Not a valid IANA timezone name (e.g. "Asia/Kolkata")' });

export const optionalIanaTimezone = ianaTimezone.optional();

// ISO 3166-1 alpha-2, uppercased.
export const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Use a 2-letter country code (e.g. "US")')
  .optional();

export const dateFormat = z.string().trim().min(1).max(20).optional();
export const timeFormat = z.enum(['12h', '24h']).optional();
