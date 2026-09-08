import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useClients } from '@/hooks/useClients';
import { useSavedPlans } from '@/hooks/usePlans';
import { SavedPlansPanel } from './SavedPlansPanel';
import { SavedPlanDialog } from './SavedPlanDialog';

export function SavedWeeklyPlansScreen() {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const clientsQuery = useClients();
  const savedPlansQuery = useSavedPlans();
  const [managingPlan, setManagingPlan] = useState(null);

  const clients = clientsQuery.data ?? [];
  const savedPlans = savedPlansQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">Reusable meal schedules</p>
        <h1 className="mt-1 text-3xl text-forest">Saved weekly plans</h1>
        <p className="mt-1 text-muted-foreground">Click a title to change dates, assign it, reuse it, or delete it.</p>
        <Link to={`/${companySlug}/app/plan`} className="mt-3 inline-block text-sm font-semibold text-coral hover:underline">
          ← Back to weekly plan
        </Link>
      </div>

      {clientsQuery.isLoading || savedPlansQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <SavedPlansPanel plans={savedPlans} clients={clients} onSelectTitle={setManagingPlan} />
      )}

      <SavedPlanDialog
        open={Boolean(managingPlan)}
        onOpenChange={(open) => !open && setManagingPlan(null)}
        plan={managingPlan}
        clients={clients}
        onApplied={({ clientId, week }) => {
          navigate(`/${companySlug}/app/plan?client=${clientId}&week=${week}`);
        }}
      />
    </div>
  );
}
