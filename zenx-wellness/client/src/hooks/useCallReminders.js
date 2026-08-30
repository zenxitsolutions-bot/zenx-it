import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listCallsRequest } from '../api/calls.api';
import { formatTime } from '../lib/format';

const POLL_MS = 20_000;
const SHOWN_KEY = 'nourishly:shownCallReminders';

function loadShown() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SHOWN_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function saveShown(shown) {
  sessionStorage.setItem(SHOWN_KEY, JSON.stringify([...shown]));
}

// Testing-stage in-app pop-up reminder: polls the caller's own calls and, once "now" enters a
// call's reminder window (reminderMinutesBefore, set at booking time), fires a Sonner toast once
// per call. Shown calls are remembered in sessionStorage so a re-render/remount doesn't re-fire the
// same toast — clears when the tab closes, which is fine for a testing feature.
export function useCallReminders(enabled) {
  const shownRef = useRef(loadShown());

  const { data } = useQuery({
    queryKey: ['calls', 'mine', 'reminders'],
    queryFn: () => listCallsRequest(),
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
  });

  useEffect(() => {
    if (!enabled || !data) return;
    const now = Date.now();

    for (const call of data) {
      if (call.status !== 'scheduled' || !call.reminderMinutesBefore) continue;
      if (shownRef.current.has(call._id)) continue;

      const msUntilCall = new Date(call.scheduledAt).getTime() - now;
      const windowMs = call.reminderMinutesBefore * 60_000;
      if (msUntilCall > 0 && msUntilCall <= windowMs) {
        const who = call.dietitian?.name ?? call.client?.name ?? 'your call';
        toast(`Upcoming call with ${who}`, {
          description: `Starts at ${formatTime(call.scheduledAt)}`,
          duration: 15_000,
        });
        shownRef.current.add(call._id);
        saveShown(shownRef.current);
      }
    }
  }, [data, enabled]);
}
