import { useState } from 'react';
import { CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/portal/shared/StatCard';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useProgress } from '@/hooks/useProgress';
import { computeProgressStats, formatMeasurementHint } from '@/lib/clientPortal';
import { WeightTrendChart } from './WeightTrendChart';
import { ProgressEntryDialog } from './ProgressEntryDialog';
import { ProgressHistoryTable } from './ProgressHistoryTable';

export function ProgressScreen() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useProgress();
  const stats = computeProgressStats(data);

  const milestones = stats
    ? [
        {
          icon: CheckCircle2,
          title: `${stats.checkInsLast30Days} check-in${stats.checkInsLast30Days === 1 ? '' : 's'} this month`,
          description: 'You showed up for yourself — that consistency adds up.',
        },
        stats.weightChangeTotal < 0
          ? {
              icon: Sparkles,
              title: `${Math.abs(stats.weightChangeTotal).toFixed(1)} kg down since you started`,
              description: 'That\'s a meaningful, lasting change.',
            }
          : {
              icon: Sparkles,
              title: 'Tracking steadily',
              description: 'Every entry builds a clearer picture over time.',
            },
        stats.energyChangeRecent != null && stats.energyChangeRecent !== 0
          ? {
              icon: TrendingUp,
              title: `Energy ${stats.energyChangeRecent > 0 ? 'up' : 'down'} ${Math.abs(stats.energyChangeRecent)} point${Math.abs(stats.energyChangeRecent) === 1 ? '' : 's'}`,
              description: 'Compared to your last check-in.',
            }
          : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-7 min-[1050px]:px-9 min-[1050px]:py-9">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand-strong uppercase">Look how far you've come</p>
          <h1 className="mt-1.5 text-3xl font-semibold text-forest">Your progress</h1>
          <p className="mt-1.5 text-muted-foreground">Every update tells a story of care and consistency.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="lg" className="rounded-pill">
          Update today's progress
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load your progress"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : !stats ? (
        <EmptyState
          icon={TrendingUp}
          title="No progress logged yet"
          description="Log your first weight check-in and your trend will appear here."
          action={
            <Button onClick={() => setDialogOpen(true)} size="lg" className="rounded-pill">
              Log your first entry
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 min-[900px]:grid-cols-[1fr_280px]">
          <section className="rounded-card border border-line bg-white p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-forest">Your weight trend</h2>
                <span className="text-xs text-muted-foreground">Every check-in you've logged so far</span>
              </div>
              <strong
                className={`rounded-pill px-3 py-1 text-sm tabular-nums ${
                  stats.weightChangeTotal <= 0
                    ? 'bg-tint-green text-positive'
                    : 'bg-tint-orange text-status-followup-ink'
                }`}
              >
                {stats.weightChangeTotal > 0 ? '+' : ''}
                {stats.weightChangeTotal.toFixed(1)} kg
              </strong>
            </div>
            <div className="mt-4">
              <WeightTrendChart data={stats.sorted} large />
            </div>
          </section>

          <aside className="rounded-card border border-line bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-forest">Lovely milestones</h2>
            <div className="mt-4 grid gap-4">
              {milestones.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sage text-brand-strong">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <strong className="block text-sm text-forest">{title}</strong>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="rounded-card border border-line bg-white p-6 shadow-soft min-[900px]:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-forest">Measurements</h2>
              {!stats.previous && (
                <span className="text-xs text-muted-foreground">Log a second entry to start seeing change over time</span>
              )}
            </div>
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
            <div className="mt-3 grid grid-cols-2 gap-3 min-[600px]:grid-cols-3">
              <StatCard label="Energy score" value={stats.latest.energy != null ? `${stats.latest.energy} / 10` : '—'} />
              <StatCard label="Adherence" value={stats.latest.adherence != null ? `${stats.latest.adherence}%` : '—'} tone="sage" />
            </div>
          </section>

          <section className="rounded-card border border-line bg-white p-6 shadow-soft min-[900px]:col-span-2">
            <h2 className="text-xl font-semibold text-forest">Full history</h2>
            <span className="text-xs text-muted-foreground">Every check-in you've logged, most recent first</span>
            <div className="mt-4">
              <ProgressHistoryTable entries={stats.sorted} />
            </div>
          </section>
        </div>
      )}

      <ProgressEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
