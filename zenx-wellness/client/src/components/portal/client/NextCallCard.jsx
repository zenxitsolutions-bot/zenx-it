import { Link, useParams } from 'react-router-dom';
import { Video } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { formatDate, formatTime } from '@/lib/format';
import { JoinMeetingButton } from '@/components/portal/shared/JoinMeetingButton';

export function NextCallCard({ call, isLoading }) {
  const { companySlug } = useParams();
  return (
    <section className="rounded-card bg-white p-6 shadow-soft">
      <h2 className="text-xl">Your next check-in</h2>

      {isLoading ? (
        <Skeleton className="mt-4 h-32 w-full" />
      ) : call ? (
        <div className="mt-4">
          <p className="font-display text-lg text-forest">{formatDate(call.scheduledAt, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
          <p className="text-sm text-muted-foreground">{formatTime(call.scheduledAt)} · 30 minute video call</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-full bg-sage font-semibold text-forest">
              {call.dietitian?.name?.[0] ?? 'D'}
            </div>
            <div>
              <strong className="block text-sm text-forest">{call.dietitian?.name ?? 'Your dietitian'}</strong>
              <span className="text-xs text-muted-foreground">Your dietitian</span>
            </div>
          </div>
          <JoinMeetingButton call={call} className="mt-4" />

          <Link
            to={`/${companySlug}/app/calls`}
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
          >
            <Video className="size-4" aria-hidden="true" /> Manage this call →
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No call scheduled"
            description="Book a check-in with your dietitian whenever suits you."
            action={
              <Link to={`/${companySlug}/app/calls`} className="text-sm font-semibold text-coral hover:underline">
                Book a call →
              </Link>
            }
          />
        </div>
      )}
    </section>
  );
}
