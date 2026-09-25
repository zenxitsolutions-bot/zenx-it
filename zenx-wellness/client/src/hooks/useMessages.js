import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { getAuthGeneration } from '../api/tokenStore';
import {
  MESSAGE_PAGE_SIZE, appendHistoryMessage, assertMessageGeneration, canApplyHistoryResult,
  fetchHistoryUpdate, mergeHistoryPage, messageThreadKey, sameConversation, settleHistoryMessage,
} from '../lib/messageHistory.js';
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const viewerId = user?._id;
  const generation = getAuthGeneration();
  const queryKey = messageThreadKey(viewerId, clientId);
  const params = { ...(clientId ? { client: clientId } : {}), limit: MESSAGE_PAGE_SIZE };
  const earlierRequests = useRef(new Set());
  useEffect(() => {
    const pending = earlierRequests.current;
    return () => {
      for (const controller of pending) controller.abort();
      pending.clear();
    };
  }, [viewerId, clientId]);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchHistoryUpdate({
      fetchPage: (cursor) => listMessagesRequest({ ...params, ...cursor }, signal),
      readCurrent: () => queryClient.getQueryData(queryKey),
      generation,
      getGeneration: getAuthGeneration,
    }),
    enabled: Boolean(viewerId) && clientId !== null,
    refetchInterval: POLL_MS,
  });
  const earlier = useMutation({
    mutationFn: async (request) => {
      assertMessageGeneration(request.generation, getAuthGeneration());
      const controller = new AbortController();
      earlierRequests.current.add(controller);
      try {
        const page = await listMessagesRequest(request.params, controller.signal);
        assertMessageGeneration(request.generation, getAuthGeneration());
        return page;
      } finally {
        earlierRequests.current.delete(controller);
      }
    },
    onSuccess: (page, request) => {
      const old = queryClient.getQueryData(request.queryKey);
      if (!canApplyHistoryResult(old, request.conversation, request.generation, getAuthGeneration())) return;
      if (!sameConversation(page.conversation, request.conversation)) {
        queryClient.invalidateQueries({ queryKey: request.queryKey, exact: true });
        return;
      }
      queryClient.setQueryData(request.queryKey, (current) => mergeHistoryPage(current, page, 'before'));
    },
  });
  return {
    ...query,
    data: query.data?.messages,
    hasEarlier: Boolean(query.data?.hasEarlier),
    hasNewer: Boolean(query.data?.hasNewer),
    loadEarlier: () => {
      const previous = queryClient.getQueryData(queryKey);
      if (!previous?.hasEarlier || !previous.beforeCursor) return Promise.resolve(null);
      // Capture the exact account/thread/session now, not the hook's possibly newer props
      // when an asynchronous mutation callback runs after logout or selecting another chat.
      return earlier.mutateAsync({
        queryKey, generation, conversation: previous.conversation,
        params: { ...params, before: previous.beforeCursor },
      });
    },
    isLoadingEarlier: earlier.isPending,
    earlierError: earlier.isError,
  };
}

export function useSendMessage(clientId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const viewerId = user?._id;
  const generation = getAuthGeneration();
  const queryKey = messageThreadKey(viewerId, clientId);
  const mutation = useMutation({
    mutationFn: (request) => {
      assertMessageGeneration(request.generation, getAuthGeneration());
      return sendMessageRequest(request.clientId ? { client: request.clientId, body: request.body } : { body: request.body });
    },
    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey: request.queryKey, exact: true });
      assertMessageGeneration(request.generation, getAuthGeneration());
      const conversation = queryClient.getQueryData(request.queryKey)?.conversation;
      const optimistic = {
        ...conversation,
        _id: `local-${crypto.randomUUID()}`,
        body: request.body,
        sender: request.viewerId,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(request.queryKey, (old) => appendHistoryMessage(old, optimistic));
      return { optimisticId: optimistic._id, conversation };
    },
    onError: (_error, request, context) => {
      queryClient.setQueryData(request.queryKey, (old) => canApplyHistoryResult(old, context?.conversation, request.generation, getAuthGeneration())
        ? settleHistoryMessage(old, context?.optimisticId) : old);
    },
    onSuccess: (saved, request, context) => {
      if (request.generation !== getAuthGeneration()) return;
      queryClient.setQueryData(request.queryKey, (old) => canApplyHistoryResult(old, context?.conversation, request.generation, getAuthGeneration())
        ? settleHistoryMessage(old, context?.optimisticId, saved) : old);
      if (!sameConversation(context?.conversation, saved)) {
        queryClient.invalidateQueries({ queryKey: request.queryKey, exact: true });
      }
      queryClient.invalidateQueries({ queryKey: ['messages', request.viewerId, 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', request.viewerId, 'unread-count'] });
    },
  });
  const requestFor = (body) => ({ body, clientId, viewerId, queryKey, generation });
  return {
    ...mutation,
    mutate: (body, options) => mutation.mutate(requestFor(body), options),
    mutateAsync: (body, options) => mutation.mutateAsync(requestFor(body), options),
  };
}

export function useMarkMessagesRead(clientId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const viewerId = user?._id;
  const generation = getAuthGeneration();
  const mutation = useMutation({
    mutationFn: (request) => {
      assertMessageGeneration(request.generation, getAuthGeneration());
      return markMessagesReadRequest(request.clientId ? { client: request.clientId } : {});
    },
    onSuccess: (_saved, request) => {
      if (request.generation === getAuthGeneration()) queryClient.invalidateQueries({ queryKey: ['messages', request.viewerId] });
    },
  });
  return {
    ...mutation,
    mutate: (_variables, options) => mutation.mutate({ clientId, viewerId, generation }, options),
    mutateAsync: (_variables, options) => mutation.mutateAsync({ clientId, viewerId, generation }, options),
  };
}

// Single-number badge count — the client's one conversation, or the dietitian's total across all
// of theirs. `enabled` lets callers skip this entirely for roles that can't message (admin).
export function useUnreadMessageCount(enabled = true) {
  const { user } = useAuth();
  const viewerId = user?._id;
  return useQuery({
    queryKey: ['messages', viewerId, 'unread-count'],
    queryFn: ({ signal }) => getUnreadMessageCountRequest(undefined, signal),
    enabled: Boolean(viewerId) && enabled,
    refetchInterval: enabled ? POLL_MS : false,
  });
}

// Dietitian's conversation list — one row per assigned client, each with a last-message preview
// and its own unread count.
export function useConversations() {
  const { user } = useAuth();
  const viewerId = user?._id;
  return useQuery({
    queryKey: ['messages', viewerId, 'conversations'],
    queryFn: ({ signal }) => listConversationsRequest(signal),
    enabled: Boolean(viewerId),
    refetchInterval: POLL_MS,
  });
}
