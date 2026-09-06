import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiBaseURL } from '@/api/axiosClient';
import { refreshRequest } from '@/api/auth.api';
import { getAccessToken, setAccessToken } from '@/api/tokenStore';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/context/PresenceContext';

function appendMessage(old, message) {
  if (!old) return old;
  if (old.some((item) => item._id === message._id)) return old;
  return [...old, message];
}

async function ensureAccessToken() {
  const existing = getAccessToken();
  if (existing) return existing;
  const { accessToken } = await refreshRequest();
  setAccessToken(accessToken);
  return accessToken;
}

export function useMessageLive(enabled) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { setOnline, replaceOnline } = usePresence();

  useEffect(() => {
    if (!enabled || !user) return undefined;
    let cancelled = false;
    let retryTimer;
    const abort = new AbortController();

    function handleEvent(event) {
      if (event.type === 'hello') {
        replaceOnline(event.onlineUserIds);
        return;
      }
      if (event.type === 'presence') {
        setOnline(event.userId, event.online);
        return;
      }
      if (event.type !== 'message' || !event.message) return;

      const message = event.message;
      const threadKey = user.role === 'client' ? 'mine' : message.client;
      queryClient.setQueryData(['messages', threadKey], (old) => appendMessage(old, message));
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
    }

    async function connect() {
      try {
        const token = await ensureAccessToken();
        if (cancelled) return;
        const response = await fetch(`${getApiBaseURL()}/messages/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
          signal: abort.signal,
        });
        if (response.status === 401) {
          setAccessToken(null);
          const { accessToken } = await refreshRequest();
          setAccessToken(accessToken);
          if (!cancelled) retryTimer = setTimeout(connect, 250);
          return;
        }
        if (!response.ok || !response.body) {
          if (!cancelled) retryTimer = setTimeout(connect, 3000);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() ?? '';
          for (const chunk of chunks) {
            const line = chunk.split('\n').find((part) => part.startsWith('data: '));
            if (!line) continue;
            try {
              handleEvent(JSON.parse(line.slice(6)));
            } catch {
              // ignore a partial/malformed frame
            }
          }
        }
      } catch {
        // reconnect below
      }
      if (!cancelled) retryTimer = setTimeout(connect, 2000);
    }

    connect();
    return () => {
      cancelled = true;
      abort.abort();
      clearTimeout(retryTimer);
    };
  }, [enabled, user?._id, user?.role, queryClient, setOnline, replaceOnline]);
}
