import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Video } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { formatDate, formatTime } from '@/lib/format';
import { JoinMeetingButton } from '@/components/portal/shared/JoinMeetingButton';

export function NextCallCard({ call, isLoading }) {
  const { companySlug } = useParams();
  return (
    <section className="rounded-card border border-line bg-white p-6 shadow-lift">
      <h2 className="text-xl font-semibold text-forest">Your next check-in</h2>

      {isLoading ? (
        <Skeleton className="mt-4 h-32 w-full" />
      ) : call ? (
        <div className="mt-4">
          <div className="flex items-center gap-4 rounded-card border border-sage bg-cream p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-coral shadow-soft">
              <CalendarDays className="size-5.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-forest">
                {formatDate(call.scheduledAt, { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-sm text-muted-foreground">{formatTime(call.scheduledAt)} · 30 minute video call</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-sage font-semibold text-brand-strong">
              {call.dietitian?.name?.[0] ?? 'D'}
            </div>
            <div className="min-w-0">
              <strong className="block truncate text-sm text-forest">{call.dietitian?.name ?? 'Your dietitian'}</strong>
              <span className="text-xs text-muted-foreground">Your dietitian</span>
            </div>
          </div>

          <JoinMeetingButton call={call} className="mt-4 w-full justify-center" />

          <Link
            to={`/${companySlug}/app/calls`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-strong hover:underline"
          >
            <Video className="size-4" aria-hidden="true" /> Manage this call
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={CalendarDays}
            title="No call scheduled"
            description="Book a check-in with your dietitian whenever suits you."
            action={
              <Link
                to={`/${companySlug}/app/calls`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-strong hover:underline"
              >
                Book a call
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
        </div>
      )}
    </section>
  );
}
