import { useSyncExternalStore } from 'react';
import { browserTimezone } from '../lib/timezone.js';

function subscribe(onChange) {
  window.addEventListener('focus', onChange);
  document.addEventListener('visibilitychange', onChange);
  return () => {
    window.removeEventListener('focus', onChange);
    document.removeEventListener('visibilitychange', onChange);
  };
}

// Re-detect on return to the app (travel or an OS time-zone correction), without polling.
export function useBrowserTimezone() {
  return useSyncExternalStore(subscribe, browserTimezone, () => 'UTC');
}
