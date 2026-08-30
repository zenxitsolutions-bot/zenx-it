import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg bg-forest px-3 py-2 text-xs text-white shadow-soft">
      <p className="font-semibold">{point.dietitian}</p>
      <p className="text-sage/80">
        {point.clients} {point.clients === 1 ? 'client' : 'clients'}
      </p>
    </div>
  );
}

// Single series (client count) — one sequential hue, no legend needed.
export function DietitianWorkloadChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="#dbe5d8" />
        <XAxis type="number" allowDecimals={false} tick={{ fill: '#6f807a', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="dietitian"
          tick={{ fill: '#193b34', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#e9f3e7' }} />
        <Bar dataKey="clients" fill="#679873" radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
