import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useDietitians } from '@/hooks/useClients';
import { useSelectDietitian } from '@/hooks/useUsers';

export function DietitianPickerDialog({ open, onOpenChange }) {
  const { user, updateUser } = useAuth();
  const { data, isLoading, isError, refetch } = useDietitians();
  const selectDietitian = useSelectDietitian();

  function handleChoose(dietitian) {
    selectDietitian.mutate(dietitian._id, {
      onSuccess: (updated) => {
        updateUser(updated);
        toast.success(`${dietitian.name} is now your dietitian.`);
        onOpenChange(false);
      },
      onError: () => toast.error("We couldn't set that — please try again."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose your dietitian</DialogTitle>
          <DialogDescription>They'll build your weekly plans and review your progress.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <EmptyState
            title="Couldn't load dietitians"
            description="Something went wrong on our end."
            action={
              <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
                Try again
              </button>
            }
          />
        ) : data.length === 0 ? (
          <EmptyState title="No dietitians available yet" description="Check back soon." />
        ) : (
          <div className="grid gap-2">
            {data.map((dietitian) => (
              <button
                key={dietitian._id}
                type="button"
                disabled={selectDietitian.isPending}
                onClick={() => handleChoose(dietitian)}
                className="flex items-center gap-3 rounded-card bg-cream p-3 text-left transition-colors hover:bg-sage/40 disabled:opacity-50"
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sage font-semibold text-forest">
                  {dietitian.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block text-forest">
                    {dietitian.name}
                    {user.assignedDietitian === dietitian._id ? ' (current)' : ''}
                  </strong>
                  <span className="text-xs text-muted-foreground">{dietitian.email}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
