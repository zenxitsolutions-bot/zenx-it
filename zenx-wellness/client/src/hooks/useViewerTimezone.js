import { useAuth } from '@/hooks/useAuth';
import { useBrowserTimezone } from './useBrowserTimezone.js';
import { resolveViewerTimezone } from '../lib/timezone.js';

// Display follows the device automatically. Schedule editors use scheduleTimezone explicitly,
// so changing display location cannot move recurring working hours or existing calls.
export function useViewerTimezone() {
  const { user } = useAuth();
  const detected = useBrowserTimezone();

  return {
    ...resolveViewerTimezone(user, detected),
    dateFormat: user?.dateFormat || 'MMM d, yyyy',
    timeFormat: user?.timeFormat || '12h',
  };
}
