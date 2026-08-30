import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDietitians } from '@/hooks/useClients';
import { DietitianPickerDialog } from './DietitianPickerDialog';

export function DietitianCard() {
  const { user } = useAuth();
  const { data } = useDietitians();
  const [pickerOpen, setPickerOpen] = useState(false);

  const assigned = data?.find((d) => d._id === user.assignedDietitian);

  return (
    <section className="rounded-card bg-white p-6 shadow-soft">
      <h2 className="text-xl">Your dietitian</h2>

      {user.assignedDietitian ? (
        <div className="mt-4 flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-sage font-semibold text-forest">
            {assigned ? assigned.name[0] : <UserRound className="size-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block text-forest">{assigned?.name ?? 'Loading…'}</strong>
            {assigned?.email && <span className="text-xs text-muted-foreground">{assigned.email}</span>}
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="shrink-0 text-sm font-semibold text-coral hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            You haven't chosen a dietitian yet. Pick one to start getting personalized plans.
          </p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="mt-3 rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral/90"
          >
            Choose a dietitian
          </button>
        </div>
      )}

      <DietitianPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} />
    </section>
  );
}
