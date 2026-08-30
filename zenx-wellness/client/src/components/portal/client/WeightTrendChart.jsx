import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg bg-forest px-3 py-2 text-xs text-white shadow-soft">
      <p className="font-semibold">{point.weight} kg</p>
      <p className="text-sage/80">{formatDate(point.date)}</p>
    </div>
  );
}

// Single series (weight over time) — one sequential hue, no legend needed (the card title names
// the series). Height/label density scale with `large` for the full Progress screen.
export function WeightTrendChart({ data, large = false }) {
  return (
    <ResponsiveContainer width="100%" height={large ? 280 : 140}>
      <AreaChart data={data} margin={{ top: 8, right: large ? 16 : 4, bottom: 0, left: large ? 0 : -24 }}>
        <defs>
          <linearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#679873" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#679873" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#dbe5d8" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: '#6f807a', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={30}
        />
        {/* domain is set unconditionally, even when hidden — omitting the YAxis entirely (as
            this used to do for the compact variant) makes recharts fall back to a domain padded
            from zero instead of tightly fit to the data, which visually flattens a real trend
            into what looks like a flat line. Caught by actually looking at a rendered screenshot,
            not by reading the code. */}
        <YAxis
          hide={!large}
          domain={['dataMin - 1', 'dataMax + 1']}
          tick={{ fill: '#6f807a', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          // Wide enough for a 6-char label like "70.8kg" — the large variant's margin.left is 0,
          // so anything narrower pushes the tick text past the container's left edge and it gets
          // clipped there (visually "70.8kg" → "0.8kg"). Caught by looking at a real screenshot
          // with real decimal weight data, not by reading the code.
          width={48}
          tickFormatter={(v) => `${v}kg`}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#679873', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Area
          type="monotone"
          dataKey="weight"
          stroke="#5f966c"
          strokeWidth={2}
          fill="url(#weightArea)"
          dot={{ r: 3, fill: '#fff', stroke: '#5f966c', strokeWidth: 2 }}
          activeDot={{ r: 5, fill: '#fff', stroke: '#5f966c', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
