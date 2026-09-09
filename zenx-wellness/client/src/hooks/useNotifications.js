import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from '../api/notifications.api';

const POLL_MS = 20_000;
const SHOWN_KEY = 'nourishly:shownInAppNotifications';

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

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: listNotificationsRequest,
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationReadRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsReadRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useInAppNotificationToasts(enabled) {
  const { data } = useNotifications(enabled);
  const shownRef = useRef(loadShown());
  const primedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !data) return;
    if (!primedRef.current) {
      for (const item of data) shownRef.current.add(item._id);
      saveShown(shownRef.current);
      primedRef.current = true;
      return;
    }
    for (const item of data) {
      if (item.readAt || shownRef.current.has(item._id)) continue;
      toast(item.title, { description: item.body || undefined, duration: 12_000 });
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification(item.title, { body: item.body || '' });
        } catch {
          // Browser Notification API is optional — the toast is enough.
        }
      }
      shownRef.current.add(item._id);
      saveShown(shownRef.current);
    }
  }, [data, enabled]);
}
