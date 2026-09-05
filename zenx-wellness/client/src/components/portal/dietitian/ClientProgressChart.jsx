import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from '@/lib/chartColors';

// The series keys are plain 'YYYY-MM-DD' calendar days (bucketed in SQL — see
// Progress.js#countProgressByDayForClients), so they're split and passed as numbers rather than
// handed to `new Date(key)`, which would parse them as UTC midnight and shift the weekday for
// anyone west of UTC.
function toLocalDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatWeekday(key) {
  return toLocalDate(key).toLocaleDateString('en-US', { weekday: 'short' });
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg bg-forest px-3 py-2 text-xs text-white shadow-soft">
      <p className="font-semibold">
        {point.logs} {point.logs === 1 ? 'entry' : 'entries'}
      </p>
      <p className="text-sage/80">{toLocalDate(point.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
    </div>
  );
}

// Counts, so the domain starts at zero and ticks stay whole — unlike WeightTrendChart, where a
// tightly fitted domain is the point. A flat line at zero here is a truthful "nothing logged this
// week", not a rendering artifact.
export function ClientProgressChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="date"
          tickFormatter={formatWeekday}
          tick={{ fill: CHART.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, (max) => Math.max(4, max)]}
          tick={{ fill: CHART.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART.line, strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Line
          type="monotone"
          dataKey="logs"
          stroke={CHART.line}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART.dot, stroke: CHART.line, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: CHART.dot, stroke: CHART.line, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
