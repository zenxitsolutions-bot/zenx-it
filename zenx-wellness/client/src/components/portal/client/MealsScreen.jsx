import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useCurrentPlan, useUpdateMealStatus } from '@/hooks/usePlans';
import { getDayKeyForDate, groupMealsByDay, computeMealCompletion } from '@/lib/clientPortal';
import { formatCalendarDate, planRangeDates } from '@/lib/calendarDate';
import { DayTabs } from './DayTabs';
import { MealCard } from './MealCard';
import { DownloadPlanPdfButton } from '@/components/portal/shared/DownloadPlanPdfButton';
import { Utensils } from 'lucide-react';

export function MealsScreen() {
  // Placeholder until the plan loads. The effect then selects today when it sits inside this
  // plan's window, or the plan's first civil day (Wednesday on a Wed–Tue week).
  const [selectedDay, setSelectedDay] = useState('');
  const { plan, isLoading, isError, refetch } = useCurrentPlan();
  const updateMeal = useUpdateMealStatus();

  // Sets the default tab once per distinct plan week — never re-runs on a background refetch of
  // the same plan (e.g. after toggling a meal's eaten status), so it doesn't yank the user back to
  // "today" after they've deliberately switched tabs.
  const defaultedForWeekRef = useRef(null);
  useEffect(() => {
    if (!plan?.week || defaultedForWeekRef.current === plan.week) return;
    defaultedForWeekRef.current = plan.week;
    const todayKey = getDayKeyForDate(plan.week, new Date(), plan.weekEnd);
    setSelectedDay(todayKey ?? planRangeDates(plan.week, plan.weekEnd)[0]);
  }, [plan?.week, plan?.weekEnd]);

  const mealsByDay = groupMealsByDay(plan);
  const dayMeals = mealsByDay[selectedDay] ?? [];
  const { completed, total } = computeMealCompletion(plan);

  function toggle(meal, field) {
    if (!plan) return;
    const next = !meal[field];
    updateMeal.mutate(
      { planId: plan._id, mealIndex: plan.meals.indexOf(meal), [field]: next },
      {
        onError: () => toast.error("That didn't save — please try again."),
        onSuccess: () => {
          if (field === 'swapRequested' && next) {
            toast.success('Swap requested — your dietitian has been notified.');
          }
        },
      }
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-7 min-[1050px]:px-9 min-[1050px]:py-9">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-strong uppercase">Made to nourish your week</p>
          <h1 className="mt-1.5 text-3xl font-semibold text-forest">This week's meals</h1>
          <p className="mt-1.5 text-muted-foreground">
            {plan
              ? `${plan.title} · ${formatCalendarDate(plan.week)} – ${formatCalendarDate(plan.weekEnd)}`
              : "Tap a meal when you've enjoyed it. Every little tick is a win."}
          </p>
        </div>
        {plan ? <DownloadPlanPdfButton planId={plan._id} /> : null}
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load your meal plan"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : !plan ? (
        <EmptyState
          icon={Utensils}
          title="No meal plan yet"
          description="Your dietitian hasn't published a weekly plan for you yet — check back soon."
        />
      ) : (
        <div className="grid gap-5 min-[900px]:grid-cols-[1fr_260px]">
          <section>
            <DayTabs weekStart={plan.week} weekEnd={plan.weekEnd} selectedDay={selectedDay} onSelect={setSelectedDay} />
            <div className="mt-4 grid gap-3">
              {dayMeals.length === 0 ? (
                <EmptyState title="No meals planned for this day" />
              ) : (
                dayMeals.map((meal) => (
                  <MealCard
                    key={`${meal.day}-${meal.time}-${meal.mealType}`}
                    meal={meal}
                    isPending={updateMeal.isPending}
                    onToggleEaten={() => toggle(meal, 'completed')}
                    onToggleSwap={() => toggle(meal, 'swapRequested')}
                  />
                ))
              )}
            </div>
          </section>

          <aside className="h-fit rounded-card bg-forest p-6 text-white shadow-lift min-[900px]:sticky min-[900px]:top-24">
            <h2 className="text-xl font-semibold text-white">Your weekly rhythm</h2>
            <p className="mt-3 text-sm text-sage/90">
              You've completed {completed} of {total} meals this week.
            </p>
            <p className="mt-4 text-4xl font-semibold tabular-nums">
              {total ? Math.round((completed / total) * 100) : 0}
              <span className="text-xl text-sage/70">%</span>
            </p>
            <Progress value={total ? (completed / total) * 100 : 0} className="mt-3 bg-white/15 [&>div]:bg-brand-2" />
          </aside>
        </div>
      )}
    </div>
  );
}
