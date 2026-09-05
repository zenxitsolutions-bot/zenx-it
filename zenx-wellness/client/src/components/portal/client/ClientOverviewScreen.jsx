import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/portal/shared/StatCard';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentPlan, useUpdateMealStatus } from '@/hooks/usePlans';
import { useCalls } from '@/hooks/useCalls';
import { useProgress } from '@/hooks/useProgress';
import { getTodayHighlightMeal, getNextCall, computeProgressStats, upcomingMealWhenLabel } from '@/lib/clientPortal';
import { formatCalendarDate } from '@/lib/calendarDate';
import { TodayMealCard } from './TodayMealCard';
import { NextCallCard } from './NextCallCard';
import { ProgressSnapshotCard } from './ProgressSnapshotCard';
import { QuickUploadCard } from './QuickUploadCard';
import { DietitianCard } from './DietitianCard';

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
    <div className="mx-auto max-w-5xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Good to see you, {firstName}. You're doing great — keep going!</p>
          <h1 className="mt-1 text-3xl text-forest">Your wellness dashboard</h1>
          <p className="mt-1 text-muted-foreground">Here's a gentle look at your day.</p>
        </div>
        <Button asChild className="rounded-full bg-coral text-white hover:bg-coral/90">
          <Link to={`/${user.companySlug}/app/progress`}>Update progress →</Link>
        </Button>
      </div>

      <div className="grid gap-5 min-[900px]:grid-cols-2">
        <section className="rounded-card bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Today's meals</h2>
            <Link to={`/${user.companySlug}/app/meals`} className="text-sm font-semibold text-forest hover:underline">
              View all meals →
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

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatCard
              label="Current plan"
              value={planQuery.plan?.title ?? '—'}
              hint={
                planQuery.plan
                  ? `Week of ${formatCalendarDate(planQuery.plan.week, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                  : undefined
              }
            />
            <StatCard
              label="Latest weight"
              tone="sage"
              value={stats ? `${stats.latest.weight} kg` : '—'}
              hint={
                stats && stats.weightChangeRecent !== 0
                  ? `${stats.weightChangeRecent < 0 ? '↓' : '↑'} ${Math.abs(stats.weightChangeRecent).toFixed(1)} kg this week`
                  : undefined
              }
            />
          </div>
        </section>

        <DietitianCard />

        <NextCallCard call={nextCall} isLoading={callsQuery.isLoading} />

        <ProgressSnapshotCard stats={stats} isLoading={progressQuery.isLoading} />

        <section className="rounded-card bg-sage/40 p-6 shadow-soft">
          <div className="mb-2 font-display text-3xl text-sage-deep">"</div>
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
