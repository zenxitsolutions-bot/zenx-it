import { UserRound } from 'lucide-react';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { MessageThread } from '@/components/portal/shared/MessageThread';
import { useAuth } from '@/hooks/useAuth';
import { useDietitians } from '@/hooks/useClients';

export function ClientMessagesScreen() {
  const { user } = useAuth();
  const { data: dietitians } = useDietitians();
  const dietitian = (dietitians ?? []).find((item) => item._id === user.assignedDietitian);

  return (
    <div className="mx-auto max-w-3xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">Stay in touch</p>
        <h1 className="mt-1 text-3xl text-forest">Messages</h1>
        <p className="mt-1 text-muted-foreground">Chat directly with your dietitian.</p>
      </div>

      {!user.assignedDietitian ? (
        <EmptyState
          icon={UserRound}
          title="No dietitian assigned yet"
          description="Contact support to get assigned a dietitian so you can start messaging."
        />
      ) : (
        <div className="rounded-card bg-white shadow-soft">
          <MessageThread title={dietitian?.name ?? 'Your dietitian'} peerId={user.assignedDietitian} />
        </div>
      )}
    </div>
  );
}
