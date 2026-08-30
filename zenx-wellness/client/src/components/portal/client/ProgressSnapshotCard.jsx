import { Link, useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { formatMeasurementHint } from '@/lib/clientPortal';
import { WeightTrendChart } from './WeightTrendChart';

export function ProgressSnapshotCard({ stats, isLoading }) {
  const { companySlug } = useParams();
  const recordedMeasurements = stats?.measurements.filter((m) => m.latestValue != null) ?? [];

  return (
    <section className="rounded-card bg-white p-6 shadow-soft min-[900px]:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Your steady progress</h2>
        {stats && (
          <strong className={stats.weightChangeTotal <= 0 ? 'text-sage-deep' : 'text-coral'}>
            {stats.weightChangeTotal > 0 ? '+' : ''}
            {stats.weightChangeTotal.toFixed(1)} kg
          </strong>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-36 w-full" />
      ) : stats ? (
        <>
          <div className="mt-2">
            <WeightTrendChart data={stats.sorted} />
          </div>

          {recordedMeasurements.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {recordedMeasurements.map((m) => (
                <span key={m.key}>
                  <strong className="text-forest">{m.label}:</strong> {m.latestValue} {m.unit}
                  {formatMeasurementHint(m) ? ` (${formatMeasurementHint(m)})` : ''}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Small steps, real change.</span>
            <Link to={`/${companySlug}/app/progress`} className="font-semibold text-forest hover:underline">
              View my progress →
            </Link>
          </div>
        </>
      ) : (
        <EmptyState
          title="No progress logged yet"
          description="Log your first weight check-in to start seeing your trend here."
          action={
            <Link to={`/${companySlug}/app/progress`} className="text-sm font-semibold text-coral hover:underline">
              Log progress →
            </Link>
          }
        />
      )}
    </section>
  );
}
