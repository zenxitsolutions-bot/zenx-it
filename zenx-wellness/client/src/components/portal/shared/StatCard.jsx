import { cn } from '@/lib/utils';

// `delta` is a percentage number, or null/undefined when there is no baseline to compare against
// (a brand-new account, a metric with no prior period). Null renders no pill at all rather than
// "0%" or "+100%" — an invented trend is worse than an absent one. `deltaHint` names the window
// the percentage came from, so the figure is never ambiguous on its own.
export function StatCard({ label, value, hint, tone = 'default', size = 'default', delta, deltaHint }) {
  const hasDelta = typeof delta === 'number';
  const rising = hasDelta && delta > 0;
  const falling = hasDelta && delta < 0;

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        tone === 'sage' ? 'border-sage bg-sage/40' : 'border-line bg-white shadow-soft'
      )}
    >
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong className={cn('block text-forest', size === 'lg' ? 'text-3xl' : 'text-xl')}>{value}</strong>
        {hasDelta && (
          // Green up / red down regardless of the brand hue — direction is the whole point of the
          // figure, and reusing the blue accent here would make it read as decoration.
          <span
            className={cn(
              'text-xs font-semibold',
              rising && 'text-positive',
              falling && 'text-negative',
              !rising && !falling && 'text-muted-foreground'
            )}
            title={deltaHint}
          >
            {rising ? '↑' : falling ? '↓' : '→'} {Math.abs(delta)}%
          </span>
        )}
      </div>
      {hint && <small className="text-xs text-muted-foreground">{hint}</small>}
    </div>
  );
}
