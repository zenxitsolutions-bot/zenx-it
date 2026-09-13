import { Link } from 'react-router-dom';
import { ArrowRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentPlan, useUpdateMealStatus } from '@/hooks/usePlans';
import { useCalls } from '@/hooks/useCalls';
import { useProgress } from '@/hooks/useProgress';
import { getTodayHighlightMeal, getNextCall, computeProgressStats, upcomingMealWhenLabel } from '@/lib/clientPortal';
import { formatCalendarDate } from '@/lib/calendarDate';
import { ClientStatsRow } from './ClientStatsRow';
import { TodayMealCard } from './TodayMealCard';
import { NextCallCard } from './NextCallCard';
import { ProgressSnapshotCard } from './ProgressSnapshotCard';
import { QuickUploadCard } from './QuickUploadCard';
import { DietitianCard } from './DietitianCard';
import { ClientDetailsCard } from './ClientDetailsCard';

export function ClientOverviewScreen() {
  const { user } = useAuth();
  const planQuery = useCurrentPlan();
  const callsQuery = useCalls();
  const progressQuery = useProgress();
  const updateMeal = useUpdateMealStatus();

  const highlight = getTodayHighlightMeal(planQuery.plan);
  const highlightMeal = highlight?.meal ?? null;
  const nextCall = getNextCall(callsQuery.data);
  const stats = computeProgressStats(progressQuery.data);
  const firstName = user.name.split(' ')[0];

  return (
    <div className="mx-auto max-w-6xl px-5 py-7 min-[1050px]:px-9 min-[1050px]:py-9">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-strong uppercase">
            Good to see you, {firstName}
          </p>
          <h1 className="mt-1.5 text-3xl font-semibold text-forest">Your wellness dashboard</h1>
          <p className="mt-1.5 text-muted-foreground">Here's a gentle look at your day.</p>
        </div>
        <Button asChild size="lg" className="rounded-pill">
          <Link to={`/${user.companySlug}/app/progress`}>
            Update progress
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <ClientStatsRow
        plan={planQuery.plan}
        stats={stats}
        nextCall={nextCall}
        isLoading={planQuery.isLoading || callsQuery.isLoading || progressQuery.isLoading}
      />

      <div className="grid gap-5 min-[900px]:grid-cols-2">
        {/* Today's plan and the next check-in lead the page, so they carry the stronger
            elevation; the supporting cards below stay on the flat `shadow-soft`. */}
        <section className="rounded-card border border-line bg-white p-6 shadow-lift">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-forest">Today's meals</h2>
            <Link
              to={`/${user.companySlug}/app/meals`}
              className="inline-flex items-center gap-1 rounded-pill px-2 py-1 text-sm font-semibold text-brand-strong transition-colors hover:bg-sage"
            >
              View all
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          {planQuery.isLoading ? (
            <Skeleton className="mt-4 h-20 w-full" />
          ) : highlightMeal ? (
            <TodayMealCard
              meal={highlightMeal}
              whenLabel={upcomingMealWhenLabel(highlight.date)}
              isPending={updateMeal.isPending}
              onMarkEaten={() =>
                updateMeal.mutate({
                  planId: planQuery.plan._id,
                  mealIndex: planQuery.plan.meals.indexOf(highlightMeal),
                  completed: true,
                })
              }
            />
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No upcoming meals"
                description="Nothing else is scheduled after this time. Check This week's meals for the full plan."
              />
            </div>
          )}

          {planQuery.plan && (
            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-card bg-cream px-4 py-3">
              <span className="text-sm font-semibold text-forest">{planQuery.plan.title}</span>
              <span className="text-xs text-muted-foreground">
                Week of{' '}
                {formatCalendarDate(planQuery.plan.week, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </section>

        <NextCallCard call={nextCall} isLoading={callsQuery.isLoading} />

        <ProgressSnapshotCard stats={stats} isLoading={progressQuery.isLoading} />

        <ClientDetailsCard />

        <DietitianCard />

        <section className="rounded-card border border-sage bg-sage/50 p-6">
          <Quote className="mb-3 size-6 text-brand-strong" aria-hidden="true" />
          <p className="text-forest">
            Consistency isn't about being perfect. You showed up for yourself {stats?.checkInsLast30Days ?? 0} time
            {stats?.checkInsLast30Days === 1 ? '' : 's'} this month.
          </p>
        </section>

        <QuickUploadCard />
      </div>
    </div>
  );
}
