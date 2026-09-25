import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { UserAvatar } from './UserAvatar';

// One conversation's paged history + composer. `clientId` omitted means "my own conversation"
// (client role); the dietitian passes the selected client's id. Handles its own loading/empty/
// error states so it can be dropped straight into either the client's standalone Messages screen
// or a panel inside the dietitian's list+thread split view.
export function MessageThread({ clientId, title, peerId }) {
  const { user } = useAuth();
  const { timezone } = useViewerTimezone();
  const { data, isLoading, isError, isFetching, refetch, hasEarlier, hasNewer, loadEarlier, isLoadingEarlier, earlierError } = useMessages(clientId);
  const sendMessage = useSendMessage(clientId);
  const markRead = useMarkMessagesRead(clientId);
  const [body, setBody] = useState('');
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const earlierScroll = useRef(null);
  const lastMessageId = useRef(null);
  const previousCount = useRef(0);
  const nearBottom = useRef(true);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const latest = data?.at(-1);
    const anchor = earlierScroll.current;
    if (container && anchor && data?.[0]?._id !== anchor.firstId) {
      container.scrollTop = anchor.top + container.scrollHeight - anchor.height;
      earlierScroll.current = null;
    } else if (latest && (latest._id !== lastMessageId.current || data.length !== previousCount.current) && !anchor
      && (nearBottom.current || latest.sender === user._id)) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
    lastMessageId.current = latest?._id;
    previousCount.current = data?.length ?? 0;
  }, [data, user._id]);

  async function showEarlier() {
    const container = scrollRef.current;
    if (isLoadingEarlier || !container) return;
    earlierScroll.current = { height: container.scrollHeight, top: container.scrollTop, firstId: data?.[0]?._id };
    try {
      const page = await loadEarlier();
      if (!page?.messages?.length) earlierScroll.current = null;
    } catch {
      earlierScroll.current = null;
    }
  }

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
    if (!trimmed || sendMessage.isPending || isLoading || !data) return;
    sendMessage.mutate(trimmed, {
      onSuccess: () => setBody(''),
      onError: () => toast.error("That didn't send — please try again."),
    });
  }

  return (
    <div className="flex h-[32rem] flex-col">
      {(title || peerId) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar userId={peerId ?? null} name={title ?? 'Conversation participant'} className="size-9" />
            <strong className="min-w-0 break-words text-forest">{title}</strong>
          </div>
          {peerId && <PresenceDot userId={peerId} />}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4" onScroll={(event) => {
        const element = event.currentTarget;
        nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      }}>
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : isError && !data ? (
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
            {hasEarlier && (
              <div className="text-center">
                <Button type="button" variant="outline" size="sm" disabled={isLoadingEarlier} onClick={showEarlier}>
                  {isLoadingEarlier ? 'Loading earlier messages…' : 'Load earlier messages'}
                </Button>
                {earlierError && <p role="alert" className="mt-2 text-xs text-muted-foreground">Couldn’t load earlier messages. Please try again.</p>}
              </div>
            )}
            {isError && <p role="alert" className="text-center text-xs text-muted-foreground">New messages couldn’t refresh. <button type="button" className="underline" onClick={() => refetch()}>Try again</button></p>}
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
            {hasNewer && (
              <Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
                {isFetching ? 'Loading newer messages…' : 'Load newer messages'}
              </Button>
            )}
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
          disabled={sendMessage.isPending || !body.trim() || isLoading || !data}
          aria-label="Send message"
          className="rounded-pill"
        >
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
