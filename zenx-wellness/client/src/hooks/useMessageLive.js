import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApiBaseURL } from '@/api/axiosClient';
import { refreshRequest } from '@/api/auth.api';
import { getAccessToken, getAuthGeneration, setAccessToken } from '@/api/tokenStore';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/context/PresenceContext';
import { appendHistoryMessage, assertMessageGeneration, messageThreadKey } from '@/lib/messageHistory.js';

function appendMessage(old, message) {
  const list = old ?? [];
  if (list.some((item) => item._id === message._id)) return list;
  return [...list, message];
}

async function ensureAccessToken(generation) {
  assertMessageGeneration(generation, getAuthGeneration());
  const existing = getAccessToken();
  if (existing) return existing;
  const { accessToken } = await refreshRequest();
  assertMessageGeneration(generation, getAuthGeneration());
  setAccessToken(accessToken, generation);
  return accessToken;
}

export function useMessageLive(enabled) {
  const { user } = useAuth();
  const userId = user?._id;
  const role = user?.role;
  const generation = getAuthGeneration();
  const queryClient = useQueryClient();
  const { setOnline, replaceOnline } = usePresence();

  useEffect(() => {
    if (!enabled || !userId) return undefined;
    let cancelled = false;
    let retryTimer;
    const abort = new AbortController();
    const isCurrent = () => !cancelled && generation === getAuthGeneration();

    function handleEvent(event) {
      if (!isCurrent()) return;
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
      if (message.channel === 'support') {
        const threadKey = role === 'dietitian' ? 'mine' : message.dietitian;
        queryClient.setQueryData(['support-messages', threadKey], (old) => appendMessage(old, message));
        queryClient.invalidateQueries({ queryKey: ['support-messages'] });
        return;
      }
      const threadKey = messageThreadKey(userId, role === 'client' ? undefined : message.client);
      queryClient.setQueryData(threadKey, (old) => appendHistoryMessage(old, message));
      queryClient.invalidateQueries({ queryKey: ['messages', userId, 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['messages', userId, 'conversations'] });
    }

    async function connect() {
      try {
        const token = await ensureAccessToken(generation);
        if (!isCurrent()) return;
        const response = await fetch(`${getApiBaseURL()}/messages/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
          signal: abort.signal,
        });
        if (!isCurrent()) return;
        if (response.status === 401) {
          // The shared refresh path handles an expired token. Clearing it first would mark
          // this generation signed out and intentionally disable cookie refresh.
          const { accessToken } = await refreshRequest();
          if (!isCurrent()) return;
          setAccessToken(accessToken, generation);
          retryTimer = setTimeout(connect, 250);
          return;
        }
        if (!response.ok || !response.body) {
          if (isCurrent()) retryTimer = setTimeout(connect, 3000);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (isCurrent()) {
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
      if (isCurrent()) retryTimer = setTimeout(connect, 2000);
    }

    connect();
    return () => {
      cancelled = true;
      abort.abort();
      clearTimeout(retryTimer);
    };
  }, [enabled, userId, role, generation, queryClient, setOnline, replaceOnline]);
}
