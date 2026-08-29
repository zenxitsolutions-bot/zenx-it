import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { SourcePerformance } from "../../services/analytics";

const COLORS = ["#d7ff42", "#7fe08a", "#5eb3f0", "#c792ea", "#ffb84d", "#ff6b6b", "#a4a59e"];

const TOOLTIP_STYLE = {
  background: "#151613",
  border: "1px solid #ffffff22",
  borderRadius: 8,
  fontSize: 12,
  color: "#f4f1e9",
};

export function SourceDonutChart({ data }: { data: SourcePerformance[] }) {
  const chartData = data.map((d) => ({ name: d.source, value: d.total }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#0a0a09" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{ fontSize: 11, color: "#a4a59e" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
