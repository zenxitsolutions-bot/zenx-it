import { Badge } from '@/components/ui/badge';
import { PresenceDot } from '@/components/portal/shared/PresenceDot';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';
import { formatDate, formatTime } from '@/lib/format';

function conversationStamp(createdAt, timezone) {
  const date = formatDate(createdAt, { day: 'numeric', month: 'short' }, timezone);
  const today = formatDate(new Date(), { day: 'numeric', month: 'short' }, timezone);
  return date === today ? formatTime(createdAt, timezone) : date;
}

export function ConversationListItem({ conversation, active, onClick }) {
  const { timezone } = useViewerTimezone();
  const { client, lastMessage, unreadCount } = conversation;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-line/60 p-3 text-left last:border-0 ${
        active ? 'bg-sage/40' : 'hover:bg-cream'
      }`}
    >
      <div className="relative grid size-9 shrink-0 place-items-center rounded-full bg-sage font-semibold text-forest">
        {client.name[0]}
        <span className="absolute -right-0.5 -bottom-0.5">
          <PresenceDot userId={client._id} showLabel={false} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <strong className="truncate text-sm text-forest">{client.name}</strong>
          {lastMessage && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {conversationStamp(lastMessage.createdAt, timezone)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{lastMessage ? lastMessage.body : 'No messages yet'}</span>
          {unreadCount > 0 && <Badge className="shrink-0 bg-coral text-white">{unreadCount}</Badge>}
        </div>
      </div>
    </button>
  );
}
