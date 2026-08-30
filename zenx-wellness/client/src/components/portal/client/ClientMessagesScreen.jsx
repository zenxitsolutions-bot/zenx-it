import { Link } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { MessageThread } from '@/components/portal/shared/MessageThread';
import { useAuth } from '@/hooks/useAuth';

export function ClientMessagesScreen() {
  const { user } = useAuth();

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
          description="Pick a dietitian from your Overview page to start messaging."
          action={
            <Link to={`/${user.companySlug}/app/overview`} className="text-sm font-semibold text-coral hover:underline">
              Go to Overview →
            </Link>
          }
        />
      ) : (
        <div className="rounded-card bg-white shadow-soft">
          <MessageThread />
        </div>
      )}
    </div>
  );
}
