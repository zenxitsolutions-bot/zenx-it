import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from '@/lib/chartColors';

const LABEL = { new: 'New', contacted: 'Contacted', 'follow-up': 'Follow-up', converted: 'Converted', closed: 'Closed' };

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg bg-forest px-3 py-2 text-xs text-white shadow-soft">
      <p className="font-semibold">
        {point.count} {point.count === 1 ? 'enquiry' : 'enquiries'}
      </p>
      <p className="text-sage/80">{LABEL[point.status]}</p>
    </div>
  );
}

// Pipeline stages have an inherent order (new → closed), not unordered category identity — a
// single-hue bar chart ordered by stage reads more honestly than a multi-hue categorical one.
export function StatusBreakdownChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis
          dataKey="status"
          tickFormatter={(status) => LABEL[status]}
          tick={{ fill: CHART.axis, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART.cursor }} />
        <Bar dataKey="count" fill={CHART.line} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
