import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { SourcePerformance } from "../../services/analytics";
import { LEGEND_STYLE, SERIES, SERIES_STROKE, TOOLTIP_STYLE } from "../../lib/chartTheme";

export function SourceDonutChart({ data }: { data: SourcePerformance[] }) {
  const chartData = data.map((d) => ({ name: d.source, value: d.total }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={SERIES[i % SERIES.length]} stroke={SERIES_STROKE} strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={LEGEND_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  );
}
