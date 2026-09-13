import { useEffect, useState } from 'react';
import { MessageCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { SupportMessageThread } from '@/components/portal/shared/SupportMessageThread';
import { ConversationListItem } from '@/components/portal/dietitian/ConversationListItem';
import { useSupportConversations } from '@/hooks/useSupportMessages';

export function AdminSupportMessagesScreen() {
  const { data, isLoading, isError, refetch } = useSupportConversations();
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!selectedId && data?.length) setSelectedId(data[0].dietitian._id);
  }, [selectedId, data]);

  const selected = data?.find((c) => c.dietitian._id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-7 min-[1050px]:px-9 min-[1050px]:py-9">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-wide text-brand-strong uppercase">Care team</p>
        <h1 className="mt-1.5 text-3xl font-semibold text-forest">Messages</h1>
        <p className="mt-1.5 text-muted-foreground">Talk with dietitians in your organisation.</p>
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
        <EmptyState icon={Users} title="No dietitians yet" description="Once a dietitian joins, you can message them here." />
      ) : (
        <div className="grid gap-5 min-[900px]:grid-cols-[280px_1fr]">
          <aside className="max-h-[32rem] overflow-y-auto rounded-card bg-white shadow-soft">
            {data.map((conversation) => (
              <ConversationListItem
                key={conversation.dietitian._id}
                conversation={{ ...conversation, client: conversation.dietitian }}
                active={conversation.dietitian._id === selectedId}
                onClick={() => setSelectedId(conversation.dietitian._id)}
              />
            ))}
          </aside>

          <section className="rounded-card bg-white shadow-soft">
            {selected ? (
              <SupportMessageThread
                dietitianId={selected.dietitian._id}
                title={selected.dietitian.name}
                peerId={selected.dietitian._id}
              />
            ) : (
              <div className="flex h-[32rem] items-center justify-center p-6">
                <EmptyState icon={MessageCircle} title="Select a conversation" description="Pick a dietitian from the list to see your messages." />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
