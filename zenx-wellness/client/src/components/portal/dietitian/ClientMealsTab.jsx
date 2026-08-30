import { Utensils } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useClientPlans } from '@/hooks/usePlans';
import { getRecentMeals } from '@/lib/clientProfile';
import { formatDate } from '@/lib/format';

const RECENT_DAYS = 15;

// Spec §6 item 3: last 15 days of meal plans — date, meal name/type, scheduled time, assigned
// food/recipe, meal notes. Can span more than one weekly plan document, hence useClientPlans
// (every plan) rather than useCurrentPlan (most recent only).
export function ClientMealsTab({ clientId }) {
  const { data, isLoading, isError, refetch } = useClientPlans(clientId);
  const meals = getRecentMeals(data, RECENT_DAYS);

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (isError) {
    return (
      <EmptyState
        title="Couldn't load meal plans"
        description="Something went wrong on our end."
        action={
          <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
            Try again
          </button>
        }
      />
    );
  }
  if (meals.length === 0) {
    return (
      <EmptyState
        icon={Utensils}
        title="No meals in the last 15 days"
        description="Meals from this client's weekly plans will show up here once assigned."
      />
    );
  }

  return (
    <section className="rounded-card bg-white p-6 shadow-soft">
      <h2 className="text-xl">Last {RECENT_DAYS} days</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Meal</th>
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">Recipe</th>
              <th className="py-2 pr-4">Notes</th>
            </tr>
          </thead>
          <tbody>
            {meals.map((meal, i) => (
              <tr key={`${meal.planId}-${meal.date}-${i}`} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-4 font-medium whitespace-nowrap text-forest">{formatDate(meal.date)}</td>
                <td className="py-2 pr-4">{meal.mealType}</td>
                <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{meal.time}</td>
                <td className="py-2 pr-4">
                  {meal.recipe ? `${meal.recipe.emoji ?? ''} ${meal.recipe.title}`.trim() : (meal.customTitle ?? '—')}
                </td>
                <td className="py-2 pr-4 text-muted-foreground">{meal.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
