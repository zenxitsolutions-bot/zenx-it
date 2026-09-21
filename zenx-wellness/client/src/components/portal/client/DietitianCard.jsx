import { useAuth } from '@/hooks/useAuth';
import { useDietitians } from '@/hooks/useClients';
import { UserAvatar } from '@/components/portal/shared/UserAvatar';

export function DietitianCard() {
  const { user } = useAuth();
  const { data } = useDietitians();

  const assigned = data?.find((d) => d._id === user.assignedDietitian);

  return (
    <section className="rounded-card border border-line bg-white p-6 shadow-soft">
      <h2 className="text-xl font-semibold text-forest">Your dietitian</h2>

      {user.assignedDietitian ? (
        <div className="mt-4 flex items-center gap-3">
          <UserAvatar userId={assigned?._id ?? user.assignedDietitian} name={assigned?.name ?? 'Your dietitian'} className="size-12 text-lg" />
          <div className="min-w-0 flex-1">
            <strong className="block truncate font-semibold text-forest">{assigned?.name ?? 'Loading…'}</strong>
            {assigned?.email && <span className="block truncate text-xs text-muted-foreground">{assigned.email}</span>}
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
