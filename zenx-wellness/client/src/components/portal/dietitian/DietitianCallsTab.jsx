import { useState } from 'react';
import { PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { CallTabs } from '@/components/portal/shared/CallTabs';
import { useCalls } from '@/hooks/useCalls';
import { groupCallsByTab } from '@/lib/clientPortal';
import { DietitianCallCard } from './DietitianCallCard';
import { DietitianCallFormDialog } from './DietitianCallFormDialog';

const EMPTY = {
  all: { title: 'No calls yet', description: 'Schedule a check-in with a client to get started.' },
  upcoming: { title: 'No upcoming calls', description: 'Schedule a check-in with a client.' },
  finished: { title: 'No finished calls', description: 'Completed and past calls will collect here.' },
  cancelled: { title: 'No cancelled calls', description: 'Nothing has been called off.' },
};

export function DietitianCallsTab() {
  const { data, isLoading, isError, refetch } = useCalls();
  const [dialog, setDialog] = useState(null); // { mode: 'schedule' | 'reschedule', call? }
  const [tab, setTab] = useState('upcoming');

  const groups = groupCallsByTab(data);
  const calls = groups[tab] ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-end gap-4">
        <Button onClick={() => setDialog({ mode: 'schedule' })} className="rounded-full bg-coral text-white hover:bg-coral/90">
          + Schedule a call
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load calls"
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
                <DietitianCallCard
                  key={call._id}
                  call={call}
                  // Rescheduling only makes sense for a call that is still going to happen —
                  // offering it on a cancelled or finished one would open a dialog whose save the
                  // server rejects.
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

      <DietitianCallFormDialog
        open={Boolean(dialog)}
        onOpenChange={(open) => !open && setDialog(null)}
        mode={dialog?.mode}
        call={dialog?.call}
      />
    </div>
  );
}
