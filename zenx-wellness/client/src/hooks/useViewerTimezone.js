import { useAuth } from '@/hooks/useAuth';
import { browserTimezone } from '@/lib/timezone';

// The one place every "show times in the viewer's zone" screen resolves "what zone am I rendering
// in" from — avoids each of format.js's 20+ call sites re-deriving this. `timezone` is the value to
// actually format with: the logged-in user's saved preference if they've set a real one, else the
// browser's own zone (so a brand-new account with the DB's 'UTC' default still sees correct-for-
// them times immediately, matching this app's existing non-breaking-default convention rather than
// literally rendering everything in UTC until they visit a settings page).
export function useViewerTimezone() {
  const { user } = useAuth();
  const detected = browserTimezone();
  const hasSavedPreference = Boolean(user?.timezone && user.timezone !== 'UTC');
  const timezone = hasSavedPreference ? user.timezone : detected;

  return {
    timezone,
    dateFormat: user?.dateFormat || 'MMM d, yyyy',
    timeFormat: user?.timeFormat || '12h',
    source: hasSavedPreference ? 'profile' : 'browser',
    browserTimezone: detected,
    // Only meaningful once a real preference is saved — a fresh 'UTC'-default account isn't a
    // "mismatch," it's just unset, so the login-mismatch banner (TimezoneMismatchBanner.jsx) checks
    // this rather than comparing the raw DB default against the browser.
    mismatch: hasSavedPreference && detected !== user.timezone,
  };
}
