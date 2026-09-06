import { useState } from 'react';
import { PhoneOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { CallTabs } from '@/components/portal/shared/CallTabs';
import { useAuth } from '@/hooks/useAuth';
import { useCalls } from '@/hooks/useCalls';
import { groupCallsByTab } from '@/lib/clientPortal';
import { CallCard } from './CallCard';
import { CallFormDialog } from './CallFormDialog';

const EMPTY = {
  all: { title: 'No calls yet', description: "Book a check-in whenever you're ready." },
  upcoming: { title: 'No upcoming calls', description: "Book a check-in whenever you're ready." },
  finished: { title: 'No finished calls', description: "Calls you've had will collect here." },
  cancelled: { title: 'No cancelled calls', description: 'Nothing has been called off.' },
};

export function CallsScreen() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useCalls();
  const [dialog, setDialog] = useState(null); // { mode: 'book' | 'reschedule', call? }
  const [tab, setTab] = useState('upcoming');

  const groups = groupCallsByTab(data);
  const calls = groups[tab] ?? [];
  const canBook = Boolean(user.assignedDietitian);

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 min-[1050px]:px-9 min-[1050px]:py-9">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-strong uppercase">Stay close to your care team</p>
          <h1 className="mt-1.5 text-3xl font-semibold text-forest">Calls</h1>
          <p className="mt-1.5 text-muted-foreground">Book, reschedule, or cancel a check-in whenever suits you.</p>
        </div>
        <Button
          disabled={!canBook}
          onClick={() => setDialog({ mode: 'book' })}
          size="lg"
          className="rounded-pill"
        >
          <Plus className="size-4" aria-hidden="true" />
          Book a call
        </Button>
      </div>

      {!canBook && !isLoading && (
        <p className="mb-4 text-sm text-muted-foreground">
          You don't have a dietitian assigned yet, so booking is unavailable — contact support to get set up.
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load your calls"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : (
        <>
          <CallTabs value={tab} onChange={setTab} groups={groups} />

          <div className="mt-5 grid gap-3">
            {calls.length === 0 ? (
              <EmptyState icon={PhoneOff} title={EMPTY[tab].title} description={EMPTY[tab].description} />
            ) : (
              calls.map((call) => (
                <CallCard
                  key={call._id}
                  call={call}
                  // Only a call that is still going to happen can be rescheduled; offering it on a
                  // finished or cancelled one opens a dialog the server would reject.
                  onReschedule={
                    call.status === 'scheduled' && new Date(call.scheduledAt).getTime() >= Date.now()
                      ? () => setDialog({ mode: 'reschedule', call })
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </>
      )}

      <CallFormDialog
        open={Boolean(dialog)}
        onOpenChange={(open) => !open && setDialog(null)}
        mode={dialog?.mode}
        call={dialog?.call}
      />
    </div>
  );
}
