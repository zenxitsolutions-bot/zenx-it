import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function formatWeek(value) {
  return new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg bg-forest px-3 py-2 text-xs text-white shadow-soft">
      <p className="font-semibold">
        {point.enquiries} {point.enquiries === 1 ? 'enquiry' : 'enquiries'}
      </p>
      <p className="text-sage/80">Week of {formatWeek(point.week)}</p>
    </div>
  );
}

// Discrete weekly counts → bar chart (magnitude over time buckets, not a continuous trend).
// Single series, one sequential hue, no legend needed.
export function EnquiryGrowthChart({ data, large = false }) {
  return (
    <ResponsiveContainer width="100%" height={large ? 280 : 140}>
      <BarChart data={data} margin={{ top: 8, right: large ? 16 : 4, bottom: 0, left: large ? 0 : -24 }}>
        <CartesianGrid vertical={false} stroke="#dbe5d8" />
        <XAxis
          dataKey="week"
          tickFormatter={formatWeek}
          tick={{ fill: '#6f807a', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={20}
        />
        {large && <YAxis allowDecimals={false} tick={{ fill: '#6f807a', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />}
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#e9f3e7' }} />
        <Bar dataKey="enquiries" fill="#679873" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
