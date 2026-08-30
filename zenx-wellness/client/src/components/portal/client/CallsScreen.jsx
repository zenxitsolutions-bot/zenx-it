import { useState } from 'react';
import { PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useCalls } from '@/hooks/useCalls';
import { splitCalls } from '@/lib/clientPortal';
import { CallCard } from './CallCard';
import { CallFormDialog } from './CallFormDialog';

export function CallsScreen() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useCalls();
  const [dialog, setDialog] = useState(null); // { mode: 'book' | 'reschedule', call? }

  const { upcoming, past } = splitCalls(data);
  const canBook = Boolean(user.assignedDietitian);

  return (
    <div className="mx-auto max-w-3xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Stay close to your care team</p>
          <h1 className="mt-1 text-3xl text-forest">Calls</h1>
          <p className="mt-1 text-muted-foreground">Book, reschedule, or cancel a check-in whenever suits you.</p>
        </div>
        <Button
          disabled={!canBook}
          onClick={() => setDialog({ mode: 'book' })}
          className="rounded-full bg-coral text-white hover:bg-coral/90"
        >
          + Book a call
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
        <div className="grid gap-8">
          <section>
            <h2 className="mb-3 text-lg text-forest">Upcoming</h2>
            {upcoming.length === 0 ? (
              <EmptyState icon={PhoneOff} title="No upcoming calls" description="Book a check-in whenever you're ready." />
            ) : (
              <div className="grid gap-3">
                {upcoming.map((call) => (
                  <CallCard key={call._id} call={call} onReschedule={() => setDialog({ mode: 'reschedule', call })} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg text-forest">Past</h2>
              <div className="grid gap-3">
                {past.map((call) => (
                  <CallCard key={call._id} call={call} />
                ))}
              </div>
            </section>
          )}
        </div>
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
