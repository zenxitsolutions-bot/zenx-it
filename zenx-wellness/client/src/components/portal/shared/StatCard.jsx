import { cn } from '@/lib/utils';

// Rounded icon chip colors, keyed by `accent`. Each pairs a soft tint ground with an ink that
// clears AA on it, so the chip works as a quiet health-metric cue rather than a block of color.
const ACCENTS = {
  brand: 'bg-sage text-brand-strong',
  hydration: 'bg-hydration-tint text-status-new-ink',
  calories: 'bg-calories-tint text-status-followup-ink',
  measure: 'bg-measure-tint text-measure-ink',
  positive: 'bg-tint-green text-positive',
};

// `delta` is a percentage number, or null/undefined when there is no baseline to compare against
// (a brand-new account, a metric with no prior period). Null renders no pill at all rather than
// "0%" or "+100%" — an invented trend is worse than an absent one. `deltaHint` names the window
// the percentage came from, so the figure is never ambiguous on its own.
//
// `icon`, `accent` and `progress` are all optional and purely presentational: a caller that
// passes none gets the same label/value/hint card it always did.
export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
  size = 'default',
  delta,
  deltaHint,
  icon: Icon,
  accent = 'brand',
  progress,
}) {
  const hasDelta = typeof delta === 'number';
  const rising = hasDelta && delta > 0;
  const falling = hasDelta && delta < 0;
  // A number outside 0–100 would overflow or invert the track, so it is clamped for display only;
  // nothing here computes or rounds the caller's figure.
  const hasProgress = typeof progress === 'number' && Number.isFinite(progress);
  const progressPct = hasProgress ? Math.min(100, Math.max(0, progress)) : 0;

  return (
    <div
      className={cn(
        'card-hover flex flex-col rounded-card border p-4',
        tone === 'sage' ? 'border-sage bg-cream' : 'border-line bg-white shadow-soft'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
        {Icon && (
          <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', ACCENTS[accent] ?? ACCENTS.brand)}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong
          className={cn(
            'block leading-tight text-forest tabular-nums',
            size === 'lg' ? 'text-3xl' : 'text-xl'
          )}
        >
          {value}
        </strong>
        {hasDelta && (
          // Green up / red down regardless of the brand hue — direction is the whole point of the
          // figure, and reusing the brand green here would make it read as decoration.
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-xs font-semibold',
              rising && 'bg-tint-green text-positive',
              falling && 'bg-tint-red text-negative',
              !rising && !falling && 'bg-muted text-muted-foreground'
            )}
            title={deltaHint}
          >
            {rising ? '↑' : falling ? '↓' : '→'} {Math.abs(delta)}%
          </span>
        )}
      </div>

      {hint && <small className="mt-0.5 text-xs text-muted-foreground">{hint}</small>}

      {hasProgress && (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progressPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} progress`}
        >
          <div
            className="h-full rounded-pill bg-coral transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
