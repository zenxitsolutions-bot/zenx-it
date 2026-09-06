import { Activity, CalendarClock, Scale, Utensils } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/portal/shared/StatCard';
import { computeMealCompletion } from '@/lib/clientPortal';
import { formatDate } from '@/lib/format';

// The summary strip at the top of the client dashboard. Every figure here is read straight off
// data the screen already has — the current plan, the calls list and the progress entries. A
// metric with no underlying record renders an em dash rather than a placeholder number, so the
// row never implies a check-in that never happened.
export function ClientStatsRow({ plan, stats, nextCall, isLoading }) {
  if (isLoading) {
    return (
      <div className="mb-5 grid gap-3 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  const { completed, total } = computeMealCompletion(plan);
  const hasWeight = stats?.latest?.weight != null;
  const weeklyChange = stats?.weightChangeRecent ?? 0;

  return (
    <div className="mb-5 grid gap-3 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-4">
      <StatCard
        label="Latest weight"
        icon={Scale}
        accent="brand"
        value={hasWeight ? `${stats.latest.weight} kg` : '—'}
        hint={
          hasWeight
            ? weeklyChange === 0
              ? 'No change since your last check-in'
              : `${weeklyChange < 0 ? '↓' : '↑'} ${Math.abs(weeklyChange).toFixed(1)} kg since your last check-in`
            : 'Log a check-in to start tracking'
        }
      />

      <StatCard
        label="Since you started"
        icon={Activity}
        accent="positive"
        value={stats ? `${stats.weightChangeTotal > 0 ? '+' : ''}${stats.weightChangeTotal.toFixed(1)} kg` : '—'}
        hint={
          stats
            ? `${stats.checkInsLast30Days} check-in${stats.checkInsLast30Days === 1 ? '' : 's'} in the last 30 days`
            : 'No progress logged yet'
        }
      />

      <StatCard
        label="Meals this week"
        icon={Utensils}
        accent="calories"
        value={total ? `${completed} / ${total}` : '—'}
        hint={total ? 'Ticked off from your current plan' : 'No plan published yet'}
        progress={total ? (completed / total) * 100 : undefined}
      />

      <StatCard
        label="Next check-in"
        icon={CalendarClock}
        accent="hydration"
        value={nextCall ? formatDate(nextCall.scheduledAt, { day: 'numeric', month: 'short' }) : '—'}
        hint={
          nextCall
            ? `with ${nextCall.dietitian?.name ?? 'your dietitian'}`
            : 'Nothing booked — pick a slot that suits you'
        }
      />
    </div>
  );
}
