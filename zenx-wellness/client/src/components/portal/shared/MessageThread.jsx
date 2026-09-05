import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';
import { useMessages, useSendMessage, useMarkMessagesRead } from '@/hooks/useMessages';
import { formatDateTime } from '@/lib/format';
import { PresenceDot } from './PresenceDot';

// One conversation's full history + composer. `clientId` omitted means "my own conversation"
// (client role); the dietitian passes the selected client's id. Handles its own loading/empty/
// error states so it can be dropped straight into either the client's standalone Messages screen
// or a panel inside the dietitian's list+thread split view.
export function MessageThread({ clientId, title, peerId }) {
  const { user } = useAuth();
  const { timezone } = useViewerTimezone();
  const { data, isLoading, isError, refetch } = useMessages(clientId);
  const sendMessage = useSendMessage(clientId);
  const markRead = useMarkMessagesRead(clientId);
  const [body, setBody] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [data]);

  // Marks the conversation read once messages are loaded, and again whenever it changes (a poll
  // brings in a new message, or — for the dietitian — the selected client changes). Mirrors
  // opening a chat thread in any messaging app.
  useEffect(() => {
    if (data?.length) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, data?.length]);

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
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-forest text-white' : 'bg-cream text-forest'}`}>
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <span className={`mt-1 block text-[10px] ${mine ? 'text-sage/70' : 'text-muted-foreground'}`}>
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
          className="rounded-full bg-coral text-white hover:bg-coral/90"
        >
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
