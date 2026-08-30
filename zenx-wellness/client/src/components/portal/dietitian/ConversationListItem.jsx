import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

export function ConversationListItem({ conversation, active, onClick }) {
  const { client, lastMessage, unreadCount } = conversation;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-line/60 p-3 text-left last:border-0 ${
        active ? 'bg-sage/40' : 'hover:bg-cream'
      }`}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sage font-semibold text-forest">
        {client.name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <strong className="truncate text-sm text-forest">{client.name}</strong>
          {lastMessage && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatDate(lastMessage.createdAt, { day: 'numeric', month: 'short' })}
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
