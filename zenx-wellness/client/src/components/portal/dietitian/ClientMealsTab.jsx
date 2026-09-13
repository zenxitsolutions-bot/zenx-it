import { Utensils } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useClientPlans } from '@/hooks/usePlans';
import { formatCalendarDate } from '@/lib/calendarDate';

export function ClientMealsTab({ clientId }) {
  const { companySlug } = useParams();
  const { data, isLoading, isError, refetch } = useClientPlans(clientId);
  const plans = data ?? [];

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
  if (plans.length === 0) {
    return (
      <EmptyState
        icon={Utensils}
        title="No weekly plans"
        description="This client's weekly plans will show up here once they are created."
      />
    );
  }

  return (
    <section className="rounded-card bg-white p-6 shadow-soft">
      <h2 className="text-xl">Weekly meal plans</h2>
      <p className="mt-1 text-sm text-muted-foreground">Select a plan name to open its complete meal schedule.</p>
      <ul className="mt-4 grid gap-3">
        {plans.map((plan) => {
          const weekEnd = plan.weekEnd || plan.week;
          const params = new URLSearchParams({
            plan: plan._id,
            client: clientId,
            week: plan.week,
            weekEnd,
          });
          return (
            <li
              key={plan._id}
              className="flex flex-col gap-3 rounded-card border border-line p-4 min-[600px]:flex-row min-[600px]:items-center min-[600px]:justify-between"
            >
              <div className="min-w-0">
                <Link
                  to={`/${companySlug}/app/plan?${params.toString()}`}
                  className="font-semibold text-forest hover:text-coral hover:underline"
                >
                  {plan.title || 'Untitled weekly plan'}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCalendarDate(plan.week)} – {formatCalendarDate(weekEnd)}
                </p>
              </div>
              <span
                className={
                  plan.published
                    ? 'w-fit rounded-full bg-sage px-2.5 py-1 text-xs font-semibold text-forest'
                    : 'w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground'
                }
              >
                {plan.published ? 'Published' : 'Draft'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
