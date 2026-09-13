import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

function Delta({ current, previous, goodWhen = 'up' }) {
  if (previous === 0) {
    return (
      <span className="text-[11px] text-dim">
        {current === 0 ? 'No activity last period' : 'First activity this period'}
      </span>
    );
  }

  const pct = ((current - previous) / previous) * 100;
  const flat = Math.abs(pct) < 0.05;
  const up = pct > 0;
  const good = flat ? null : up ? goodWhen === 'up' : goodWhen === 'down';
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <span className="flex items-center gap-1.5 text-[11px]">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 font-semibold',
          good === null && 'bg-cream text-muted-foreground',
          good === true && 'bg-tint-green text-status-converted-ink',
          good === false && 'bg-tint-red text-status-lost-ink'
        )}
      >
        <Icon size={11} />
        {flat ? '0%' : `${Math.abs(pct).toFixed(0)}%`}
      </span>
      <span className="text-dim">vs last month</span>
    </span>
  );
}

const TONES = {
  blue: 'bg-tint-blue text-coral',
  purple: 'bg-tint-purple text-status-contacted',
  orange: 'bg-tint-orange text-status-followup-ink',
  green: 'bg-tint-green text-status-converted-ink',
  red: 'bg-tint-red text-status-lost-ink',
};

export function AdminKpiCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  description,
  current,
  previous,
  goodWhen,
  to,
}) {
  const hasDelta = typeof current === 'number' && typeof previous === 'number';

  const body = (
    <div className="flex h-full flex-col gap-3 rounded-card border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</span>
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-card', TONES[tone] ?? TONES.blue)}>
          <Icon size={16} />
        </span>
      </div>

      <span className="font-display text-[30px] leading-none text-forest">{value}</span>

      <div className="mt-auto flex flex-col gap-1">
        {hasDelta ? (
          <Delta current={current} previous={previous} goodWhen={goodWhen} />
        ) : (
          description && <span className="text-[11px] text-dim">{description}</span>
        )}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full rounded-card focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}
