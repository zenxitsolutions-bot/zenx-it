import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/portal/shared/StatCard';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useAdminOverview } from '@/hooks/useInsights';
import { EnquiryGrowthChart } from './EnquiryGrowthChart';
import { DietitianWorkloadChart } from './DietitianWorkloadChart';

export function AdminOverviewScreen() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAdminOverview();

  return (
    <div className="mx-auto max-w-5xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Business pulse</p>
          <h1 className="mt-1 text-3xl text-forest">Good to see you, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-muted-foreground">Warm care is growing — here's what needs your attention.</p>
        </div>
        <Button asChild className="rounded-full bg-coral text-white hover:bg-coral/90">
          <Link to={`/${user.companySlug}/app/enquiries`}>View enquiries →</Link>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load your overview"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : (
        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-4">
            <StatCard label="New enquiries" value={data.newEnquiries} tone="sage" />
            <StatCard label="Follow-ups today" value={data.followUpsToday} />
            <StatCard label="Conversion rate" value={`${data.conversionRate}%`} tone="sage" />
            <StatCard label="Active clients" value={data.activeClients} />
          </div>

          <div className="grid gap-5 min-[900px]:grid-cols-2">
            <section className="rounded-card bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-xl">Growth over the last 8 weeks</h2>
                <Link to={`/${user.companySlug}/app/insights`} className="text-sm font-semibold text-forest hover:underline">
                  View insights →
                </Link>
              </div>
              <div className="mt-2">
                <EnquiryGrowthChart data={data.growthSeries} />
              </div>
            </section>

            <section className="rounded-card bg-white p-6 shadow-soft">
              <h2 className="text-xl">Dietitian workload</h2>
              {data.dietitianWorkload.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No dietitians yet.</p>
              ) : (
                <div className="mt-2">
                  <DietitianWorkloadChart data={data.dietitianWorkload} />
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
