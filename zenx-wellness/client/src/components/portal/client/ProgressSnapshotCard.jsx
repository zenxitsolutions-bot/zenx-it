import { Link, useParams } from 'react-router-dom';
import { ArrowRight, LineChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { formatMeasurementHint } from '@/lib/clientPortal';
import { WeightTrendChart } from './WeightTrendChart';

export function ProgressSnapshotCard({ stats, isLoading }) {
  const { companySlug } = useParams();
  const recordedMeasurements = stats?.measurements.filter((m) => m.latestValue != null) ?? [];

  return (
    <section className="rounded-card border border-line bg-white p-6 shadow-lift min-[900px]:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-forest">Your steady progress</h2>
          <span className="text-xs text-muted-foreground">Weight across every check-in you've logged</span>
        </div>
        {stats && (
          // Down is the direction most clients are working toward, so it gets the calm green
          // chip; up gets the neutral amber one rather than an alarm red.
          <strong
            className={`rounded-pill px-3 py-1 text-sm tabular-nums ${
              stats.weightChangeTotal <= 0 ? 'bg-tint-green text-positive' : 'bg-tint-orange text-status-followup-ink'
            }`}
          >
            {stats.weightChangeTotal > 0 ? '+' : ''}
            {stats.weightChangeTotal.toFixed(1)} kg
          </strong>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-36 w-full" />
      ) : stats ? (
        <>
          <div className="mt-4">
            <WeightTrendChart data={stats.sorted} />
          </div>

          {recordedMeasurements.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {recordedMeasurements.map((m) => (
                <span
                  key={m.key}
                  className="rounded-pill bg-cream px-3 py-1.5 text-xs text-muted-foreground"
                  title={formatMeasurementHint(m)}
                >
                  <strong className="font-semibold text-forest">{m.label}</strong> {m.latestValue} {m.unit}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm">
            <span className="text-muted-foreground">Small steps, real change.</span>
            <Link
              to={`/${companySlug}/app/progress`}
              className="inline-flex items-center gap-1 font-semibold text-brand-strong hover:underline"
            >
              View my progress
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={LineChart}
            title="No progress logged yet"
            description="Log your first weight check-in to start seeing your trend here."
            action={
              <Link
                to={`/${companySlug}/app/progress`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-strong hover:underline"
              >
                Log progress
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
        </div>
      )}
    </section>
  );
}
