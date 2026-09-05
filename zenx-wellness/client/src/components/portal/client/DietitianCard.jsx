import { UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDietitians } from '@/hooks/useClients';

export function DietitianCard() {
  const { user } = useAuth();
  const { data } = useDietitians();

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
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          You don't have a dietitian assigned yet. Contact support to get set up.
        </p>
      )}
    </section>
  );
}
