import { useEffect, useState } from 'react';
import { MessageCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { MessageThread } from '@/components/portal/shared/MessageThread';
import { useConversations } from '@/hooks/useMessages';
import { ConversationListItem } from './ConversationListItem';

// Spec §1.5: dietitians see a conversation list (they have multiple clients) — a classic
// list-on-the-left, thread-on-the-right split, so switching between clients never leaves the page.
export function DietitianMessagesScreen() {
  const { data, isLoading, isError, refetch } = useConversations();
  const [selectedClientId, setSelectedClientId] = useState(null);

  // Auto-select the most relevant conversation (the list is already ordered most-recent-first)
  // once it loads, so the thread panel is never empty when there's an obvious default.
  useEffect(() => {
    if (!selectedClientId && data?.length) setSelectedClientId(data[0].client._id);
  }, [selectedClientId, data]);

  const selected = data?.find((c) => c.client._id === selectedClientId) ?? null;

  return (
    <div className="mx-auto max-w-6xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">Stay close to your clients</p>
        <h1 className="mt-1 text-3xl text-forest">Messages</h1>
      </div>

      {isLoading ? (
        <Skeleton className="h-[32rem] w-full" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load conversations"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : !data?.length ? (
        <EmptyState icon={Users} title="No clients yet" description="Once a client is assigned to you, you'll be able to message them here." />
      ) : (
        <div className="grid gap-5 min-[900px]:grid-cols-[280px_1fr]">
          <aside className="max-h-[32rem] overflow-y-auto rounded-card bg-white shadow-soft">
            {data.map((conversation) => (
              <ConversationListItem
                key={conversation.client._id}
                conversation={conversation}
                active={conversation.client._id === selectedClientId}
                onClick={() => setSelectedClientId(conversation.client._id)}
              />
            ))}
          </aside>

          <section className="rounded-card bg-white shadow-soft">
            {selected ? (
              <MessageThread clientId={selected.client._id} title={selected.client.name} />
            ) : (
              <div className="flex h-[32rem] items-center justify-center p-6">
                <EmptyState icon={MessageCircle} title="Select a conversation" description="Pick a client from the list to see your messages." />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
