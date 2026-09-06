import { PhoneOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useCalls } from '@/hooks/useCalls';
import { CALL_HISTORY_SECTIONS, groupCallHistory } from '@/lib/clientProfile';
import { ClientCallHistoryCard } from './ClientCallHistoryCard';

// Spec §6 item 4: call history — upcoming, previous, completed, cancelled (rescheduled is shown
// as a badge on whichever of those a rescheduled call currently sits in, since a reschedule moves
// the same call rather than creating a separate record).
export function ClientCallsTab({ clientId }) {
  const { data, isLoading, isError, refetch } = useCalls(clientId);
  const groups = groupCallHistory(data);
  const hasAny = (data?.length ?? 0) > 0;

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (isError) {
    return (
      <EmptyState
        title="Couldn't load calls"
        description="Something went wrong on our end."
        action={
          <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
            Try again
          </button>
        }
      />
    );
  }
  if (!hasAny) {
    return <EmptyState icon={PhoneOff} title="No calls yet" description="Calls booked with this client will show up here." />;
  }

  return (
    <div className="grid gap-8">
      {CALL_HISTORY_SECTIONS.map(({ bucket, title }) =>
        groups[bucket].length === 0 ? null : (
          <section key={bucket}>
            <h2 className="mb-3 text-lg text-forest">{title}</h2>
            <div className="grid gap-3">
              {groups[bucket].map((call) => (
                <ClientCallHistoryCard key={call._id} call={call} />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}
