import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART } from '@/lib/chartColors';

// Active / Completed / Draft are the three states a plan can actually be in — `plans` has no
// status column, they're derived from `published` + whether the plan's week has ended (see
// Plan.js#countPlanStatesForDietitian). Three steps within the blue family rather than three
// unrelated hues: the states are a progression (draft → active → finished), and the ring reads as
// one metric split up instead of three competing ones.
const SEGMENTS = [
  { key: 'active', label: 'Active', color: CHART.line },
  { key: 'completed', label: 'Completed', color: CHART.lineDeep },
  { key: 'draft', label: 'Draft', color: '#cbd5e1' },
];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg bg-forest px-3 py-2 text-xs text-white shadow-soft">
      <p className="font-semibold">
        {point.value} {point.value === 1 ? 'plan' : 'plans'}
      </p>
      <p className="text-sage/80">{point.label}</p>
    </div>
  );
}

export function PlansOverviewChart({ breakdown }) {
  const data = SEGMENTS.map((s) => ({ ...s, value: breakdown[s.key] ?? 0 }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2} strokeWidth={0}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Total in the hole: the ring shows the split, the number answers "out of how many?" —
            without it each percentage below is unanchored. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <strong className="block text-xl leading-none text-forest">{total}</strong>
            <span className="text-[10px] tracking-wide text-muted-foreground uppercase">Plans</span>
          </div>
        </div>
      </div>

      <ul className="grid min-w-[140px] flex-1 gap-2">
        {data.map((entry) => (
          <li key={entry.key} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="flex-1 text-muted-foreground">{entry.label}</span>
            <strong className="text-forest">{entry.value}</strong>
            {/* Guarded: a percentage of zero plans is 0/0, which would render "NaN%". */}
            <span className="w-10 text-right text-xs text-muted-foreground">
              {total ? `${Math.round((entry.value / total) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
