import { useEffect } from 'react';
import { registerDeviceTokenRequest } from '../api/deviceTokens.api';

const TOKEN_KEY = 'nourishly:deviceToken';

function getOrCreateWebToken() {
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return null;
  }
}

// Registers this browser as a notification target after login, and asks for the Notification
// permission used by useCallReminders. Failures are swallowed — missing permission must never
// block using the app.
export function useDeviceNotifications(enabled) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const token = getOrCreateWebToken();
    if (token) {
      registerDeviceTokenRequest({ token, platform: 'web' }).catch(() => {});
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [enabled]);
}
