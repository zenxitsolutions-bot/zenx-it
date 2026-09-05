import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  listMessagesRequest,
  sendMessageRequest,
  markMessagesReadRequest,
  getUnreadMessageCountRequest,
  listConversationsRequest,
} from '../api/messages.api';

const POLL_MS = 15_000; // tighter than useCalls' 20s — a chat should feel closer to live

// clientId: the dietitian's selected client (whose conversation to load); omitted → "my own"
// (client role, server auto-scopes to their assigned dietitian). Passing `null` explicitly (the
// dietitian has no conversation selected yet) disables the query — mirrors useProgress/useCalls.
export function useMessages(clientId) {
  return useQuery({
    queryKey: ['messages', clientId ?? 'mine'],
    queryFn: () => listMessagesRequest(clientId ? { client: clientId } : undefined),
    enabled: clientId !== null,
    refetchInterval: POLL_MS,
  });
}

export function useSendMessage(clientId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const threadKey = clientId ?? 'mine';
  return useMutation({
    mutationFn: (body) => sendMessageRequest(clientId ? { client: clientId, body } : { body }),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ['messages', threadKey] });
      const previous = queryClient.getQueryData(['messages', threadKey]);
      const optimistic = {
        _id: `local-${Date.now()}`,
        body,
        sender: user._id,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['messages', threadKey], (old = []) => [...old, optimistic]);
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(['messages', threadKey], context.previous);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['messages', threadKey], (old = []) => {
        const withoutOptimistic = old.filter((message) => !String(message._id).startsWith('local-'));
        if (withoutOptimistic.some((message) => message._id === saved._id)) return withoutOptimistic;
        return [...withoutOptimistic, saved];
      });
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
    },
  });
}

export function useMarkMessagesRead(clientId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markMessagesReadRequest(clientId ? { client: clientId } : {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });
}

// Single-number badge count — the client's one conversation, or the dietitian's total across all
// of theirs. `enabled` lets callers skip this entirely for roles that can't message (admin).
export function useUnreadMessageCount(enabled = true) {
  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => getUnreadMessageCountRequest(),
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
  });
}

// Dietitian's conversation list — one row per assigned client, each with a last-message preview
// and its own unread count.
export function useConversations() {
  return useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: listConversationsRequest,
    refetchInterval: POLL_MS,
  });
}
