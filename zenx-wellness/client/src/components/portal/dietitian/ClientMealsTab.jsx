import { useState } from 'react';
import { Pencil, Trash2, Utensils } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DeletePlanDialog } from '@/components/portal/shared/DeletePlanDialog';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useClientPlans, useDeletePlan } from '@/hooks/usePlans';
import { formatCalendarDate } from '@/lib/calendarDate';
import { hasPermission } from '@/lib/permissions';

export function ClientMealsTab({ clientId }) {
  const { companySlug } = useParams();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useClientPlans(clientId);
  const deletePlan = useDeletePlan();
  const [planToDelete, setPlanToDelete] = useState(null);
  const plans = data ?? [];
  const canManage = (plan) => user?.role === 'admin' || (
    user?.role === 'dietitian'
    && Boolean(user?._id)
    && String(plan.dietitian?._id ?? plan.dietitian) === String(user._id)
  );

  async function handleDelete() {
    // Keep the exact plan selected in the confirmation, even if the list refetches.
    if (!planToDelete || deletePlan.isPending || !canManage(planToDelete) || !hasPermission(user, 'diet_plans.delete') || (planToDelete.published && !hasPermission(user, 'diet_plans.publish'))) return;
    try {
      await deletePlan.mutateAsync(planToDelete._id);
      setPlanToDelete(null);
      toast.success('Plan deleted.');
    } catch (error) {
      toast.error(error.response?.data?.error || "We couldn't delete that plan. Please try again.");
    }
  }

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
          const editParams = new URLSearchParams(params);
          editParams.set('edit', '1');
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
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span
                  className={
                    plan.published
                      ? 'w-fit rounded-full bg-sage px-2.5 py-1 text-xs font-semibold text-forest'
                      : 'w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground'
                  }
                >
                  {plan.published ? 'Published' : 'Draft'}
                </span>
                {canManage(plan) && (!plan.published || hasPermission(user, 'diet_plans.publish')) && (
                  <>
                    {hasPermission(user, 'diet_plans.edit') && <Button asChild variant="outline" size="sm">
                      <Link to={`/${companySlug}/app/plan?${editParams.toString()}`}>
                        <Pencil aria-hidden="true" />
                        Edit plan
                      </Link>
                    </Button>}
                    {hasPermission(user, 'diet_plans.delete') && <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={deletePlan.isPending}
                      onClick={() => setPlanToDelete(plan)}
                    >
                      <Trash2 aria-hidden="true" />
                      Delete plan
                    </Button>}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <DeletePlanDialog
        open={Boolean(planToDelete)}
        onOpenChange={(open) => {
          if (!open && !deletePlan.isPending) setPlanToDelete(null);
        }}
        plan={planToDelete}
        clientName={planToDelete?.client?.name}
        pending={deletePlan.isPending}
        onConfirm={handleDelete}
      />
    </section>
  );
}
