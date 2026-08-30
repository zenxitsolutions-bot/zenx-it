import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useCurrentPlan, useUpdateMealStatus } from '@/hooks/usePlans';
import { getTodayName, getDayKeyForDate, groupMealsByDay, computeMealCompletion } from '@/lib/clientPortal';
import { DayTabs } from './DayTabs';
import { MealCard } from './MealCard';
import { Utensils } from 'lucide-react';

export function MealsScreen() {
  // getTodayName() is only a placeholder here, before `plan` (and therefore its actual week start)
  // has loaded — the effect below immediately corrects it to today's real position within THIS
  // plan's week via getDayKeyForDate, which is what actually matters once a week doesn't
  // necessarily start on a Monday (see DayTabs.jsx/clientPortal.js's own comments on this split).
  const [selectedDay, setSelectedDay] = useState(getTodayName());
  const { plan, isLoading, isError, refetch } = useCurrentPlan();
  const updateMeal = useUpdateMealStatus();

  // Sets the default tab once per distinct plan week — never re-runs on a background refetch of
  // the same plan (e.g. after toggling a meal's eaten status), so it doesn't yank the user back to
  // "today" after they've deliberately switched tabs.
  const defaultedForWeekRef = useRef(null);
  useEffect(() => {
    if (!plan?.week || defaultedForWeekRef.current === plan.week) return;
    defaultedForWeekRef.current = plan.week;
    const todayKey = getDayKeyForDate(plan.week);
    if (todayKey) setSelectedDay(todayKey);
  }, [plan?.week]);

  const mealsByDay = groupMealsByDay(plan);
  const dayMeals = mealsByDay[selectedDay] ?? [];
  const { completed, total } = computeMealCompletion(plan);

  function toggle(meal, field) {
    if (!plan) return;
    updateMeal.mutate(
      { planId: plan._id, mealIndex: plan.meals.indexOf(meal), [field]: !meal[field] },
      { onError: () => toast.error("That didn't save — please try again.") }
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Made to nourish your week</p>
          <h1 className="mt-1 text-3xl text-forest">This week's meals</h1>
          <p className="mt-1 text-muted-foreground">Tap a meal when you've enjoyed it. Every little tick is a win.</p>
        </div>
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
            <DayTabs weekStart={plan.week} selectedDay={selectedDay} onSelect={setSelectedDay} />
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

          <aside className="rounded-card bg-forest p-6 text-white shadow-soft">
            <h2 className="text-xl">Your weekly rhythm</h2>
            <p className="mt-3 text-sm text-sage/90">
              You've completed {completed} of {total} meals this week.
            </p>
            <Progress value={total ? (completed / total) * 100 : 0} className="mt-3 bg-white/15 [&>div]:bg-yellow" />
          </aside>
        </div>
      )}
    </div>
  );
}
