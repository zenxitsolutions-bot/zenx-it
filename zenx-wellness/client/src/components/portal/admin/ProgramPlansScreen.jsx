import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useProgramPlans } from '@/hooks/useProgramPlans';
import { ProgramPlanFormDialog } from './ProgramPlanFormDialog';

export function ProgramPlansScreen() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading, isError, refetch } = useProgramPlans();

  return (
    <div className="mx-auto max-w-3xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Available to every dietitian, for their clients</p>
          <h1 className="mt-1 text-3xl text-forest">Plans</h1>
          <p className="mt-1 text-muted-foreground">Create and manage the plans clients can be enrolled in.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="rounded-full bg-coral text-white hover:bg-coral/90">
          + Create plan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load plans"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : !data?.length ? (
        <EmptyState icon={ClipboardList} title="No plans yet" description="Create the first plan clients can be enrolled in." />
      ) : (
        <div className="grid gap-2">
          {data.map((plan) => (
            <div key={plan._id} className="flex items-center gap-3 rounded-card bg-white p-4 shadow-soft">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <strong className="text-forest">{plan.name}</strong>
                  <Badge variant={plan.active ? 'secondary' : 'outline'}>{plan.active ? 'Active' : 'Inactive'}</Badge>
                </div>
                {plan.description && <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => setEditing(plan)}
                className="shrink-0 text-sm font-semibold text-forest hover:underline"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      <ProgramPlanFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editing && (
        <ProgramPlanFormDialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} plan={editing} />
      )}
    </div>
  );
}
