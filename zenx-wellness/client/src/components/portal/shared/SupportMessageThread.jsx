import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { PresenceDot } from '@/components/portal/shared/PresenceDot';
import { useAuth } from '@/hooks/useAuth';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';
import { useSupportMessages, useSendSupportMessage, useMarkSupportMessagesRead } from '@/hooks/useSupportMessages';
import { formatDateTime } from '@/lib/format';

export function SupportMessageThread({ dietitianId, title, peerId }) {
  const { user } = useAuth();
  const { timezone } = useViewerTimezone();
  const { data, isLoading, isError, refetch } = useSupportMessages(dietitianId);
  const sendMessage = useSendSupportMessage(dietitianId);
  const markRead = useMarkSupportMessagesRead(dietitianId);
  const [body, setBody] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [data]);

  useEffect(() => {
    if (data?.length) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dietitianId, data?.length]);

  function submit(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    sendMessage.mutate(trimmed, {
      onSuccess: () => setBody(''),
      onError: () => toast.error("That didn't send — please try again."),
    });
  }

  return (
    <div className="flex h-[32rem] flex-col">
      {(title || peerId) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <strong className="text-forest">{title}</strong>
          {peerId && <PresenceDot userId={peerId} />}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : isError ? (
          <EmptyState
            title="Couldn't load messages"
            description="Something went wrong on our end."
            action={
              <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
                Try again
              </button>
            }
          />
        ) : !data?.length ? (
          <EmptyState icon={MessageCircle} title="No messages yet" description="Send the first one below." />
        ) : (
          <div className="grid gap-3">
            {data.map((message) => {
              const mine = message.sender === user._id;
              return (
                <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-coral text-white' : 'border border-line bg-cream text-forest'}`}>
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <span className={`mt-1 block text-[10px] ${mine ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {formatDateTime(message.createdAt, timezone)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-line p-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
          placeholder="Write a message…"
          rows={1}
          className="max-h-32 flex-1 resize-none"
        />
        <Button
          type="submit"
          size="icon"
          disabled={sendMessage.isPending || !body.trim()}
          aria-label="Send message"
          className="rounded-pill"
        >
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
