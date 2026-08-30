import { LineChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/portal/shared/StatCard';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { WeightTrendChart } from '@/components/portal/client/WeightTrendChart';
import { ProgressHistoryTable } from '@/components/portal/client/ProgressHistoryTable';
import { useProgress } from '@/hooks/useProgress';
import { computeProgressStats, formatMeasurementHint } from '@/lib/clientPortal';

// Spec §6 item 2: full progress history (weight, hip, thigh, waist, upper arm) with a chart —
// read-only here (the client is the only one who logs entries); reuses the same stats/formatting
// helpers and history table as the client's own My Progress screen so the two never disagree.
export function ClientProgressTab({ clientId }) {
  const { data, isLoading, isError, refetch } = useProgress(clientId);
  const stats = computeProgressStats(data);

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (isError) {
    return (
      <EmptyState
        title="Couldn't load progress"
        description="Something went wrong on our end."
        action={
          <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
            Try again
          </button>
        }
      />
    );
  }
  if (!stats) {
    return <EmptyState icon={LineChart} title="No progress logged yet" description="Entries this client logs will appear here." />;
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-card bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Weight trend</h2>
          <strong className={stats.weightChangeTotal <= 0 ? 'text-sage-deep' : 'text-coral'}>
            {stats.weightChangeTotal > 0 ? '+' : ''}
            {stats.weightChangeTotal.toFixed(1)} kg
          </strong>
        </div>
        <div className="mt-4">
          <WeightTrendChart data={stats.sorted} large />
        </div>
      </section>

      <section className="rounded-card bg-white p-6 shadow-soft">
        <h2 className="text-xl">Measurements</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 min-[600px]:grid-cols-3 min-[900px]:grid-cols-5">
          {stats.measurements.map((m) => (
            <StatCard
              key={m.key}
              label={m.label}
              tone={m.key === 'weight' ? 'sage' : 'default'}
              value={m.latestValue != null ? `${m.latestValue} ${m.unit}` : '—'}
              hint={formatMeasurementHint(m)}
            />
          ))}
        </div>
      </section>

      <section className="rounded-card bg-white p-6 shadow-soft">
        <h2 className="text-xl">Full history</h2>
        <span className="text-xs text-muted-foreground">Every check-in this client has logged, most recent first</span>
        <div className="mt-4">
          <ProgressHistoryTable entries={stats.sorted} />
        </div>
      </section>
    </div>
  );
}
