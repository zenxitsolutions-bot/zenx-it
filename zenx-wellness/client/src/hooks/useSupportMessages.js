import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  listSupportMessagesRequest,
  sendSupportMessageRequest,
  markSupportMessagesReadRequest,
  getSupportUnreadCountRequest,
  listSupportConversationsRequest,
} from '../api/supportMessages.api';

const POLL_MS = 15_000;

export function useSupportMessages(dietitianId) {
  const { user } = useAuth();
  const isDietitian = user.role === 'dietitian';
  const threadKey = isDietitian ? 'mine' : dietitianId;
  return useQuery({
    queryKey: ['support-messages', threadKey],
    queryFn: () => listSupportMessagesRequest(isDietitian ? undefined : { dietitian: dietitianId }),
    enabled: isDietitian || Boolean(dietitianId),
    refetchInterval: POLL_MS,
  });
}

export function useSendSupportMessage(dietitianId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const threadKey = user.role === 'dietitian' ? 'mine' : dietitianId;
  return useMutation({
    mutationFn: (body) =>
      sendSupportMessageRequest(user.role === 'dietitian' ? { body } : { dietitian: dietitianId, body }),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ['support-messages', threadKey] });
      const previous = queryClient.getQueryData(['support-messages', threadKey]);
      const optimistic = {
        _id: `local-${Date.now()}`,
        body,
        sender: user._id,
        dietitian: user.role === 'dietitian' ? user._id : dietitianId,
        channel: 'support',
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['support-messages', threadKey], (old = []) => [...old, optimistic]);
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(['support-messages', threadKey], context.previous);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['support-messages', threadKey], (old = []) => {
        const withoutOptimistic = old.filter((message) => !String(message._id).startsWith('local-'));
        if (withoutOptimistic.some((message) => message._id === saved._id)) return withoutOptimistic;
        return [...withoutOptimistic, saved];
      });
      queryClient.invalidateQueries({ queryKey: ['support-messages'] });
    },
  });
}

export function useMarkSupportMessagesRead(dietitianId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () =>
      markSupportMessagesReadRequest(user.role === 'dietitian' ? {} : { dietitian: dietitianId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['support-messages'] }),
  });
}

export function useSupportUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ['support-messages', 'unread-count'],
    queryFn: getSupportUnreadCountRequest,
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
  });
}

export function useSupportConversations() {
  return useQuery({
    queryKey: ['support-messages', 'conversations'],
    queryFn: listSupportConversationsRequest,
    refetchInterval: POLL_MS,
  });
}
