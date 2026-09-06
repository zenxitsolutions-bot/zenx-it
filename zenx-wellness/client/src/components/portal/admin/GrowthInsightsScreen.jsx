import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAdminOverview } from '@/hooks/useInsights';
import { EnquiryGrowthChart } from './EnquiryGrowthChart';
import { DietitianWorkloadChart } from './DietitianWorkloadChart';
import { StatusBreakdownChart } from './StatusBreakdownChart';

export function GrowthInsightsScreen() {
  const { data, isLoading, isError, refetch } = useAdminOverview();

  const totalThisPeriod = data?.growthSeries.reduce((sum, w) => sum + w.enquiries, 0) ?? 0;

  return (
    <div className="mx-auto max-w-5xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">The bigger picture</p>
        <h1 className="mt-1 text-3xl text-forest">Growth insights</h1>
        <p className="mt-1 text-muted-foreground">How the pipeline and your team are trending.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load insights"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : (
        <div className="grid gap-5">
          <section className="rounded-card bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl">Enquiry volume</h2>
                <span className="text-xs text-muted-foreground">Last 8 weeks, by week received</span>
              </div>
              <strong className="text-sage-deep">{totalThisPeriod} total</strong>
            </div>
            <div className="mt-4">
              <EnquiryGrowthChart data={data.growthSeries} large />
            </div>
          </section>

          <section className="rounded-card bg-white p-6 shadow-soft">
            <h2 className="text-xl">Pipeline breakdown</h2>
            <span className="text-xs text-muted-foreground">Every enquiry, by current stage</span>
            <div className="mt-4">
              <StatusBreakdownChart data={data.statusBreakdown} />
            </div>
          </section>

          <section className="rounded-card bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Dietitian workload</h2>
              <span className="text-xs text-muted-foreground">{data.activeClients} active clients total</span>
            </div>
            {data.dietitianWorkload.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No dietitians yet.</p>
            ) : (
              <div className="mt-4">
                <DietitianWorkloadChart data={data.dietitianWorkload} />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
