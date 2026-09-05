import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonthlyPoint } from "../../services/analytics";
import { CHART, LEGEND_STYLE, TOOLTIP_STYLE } from "../../lib/chartTheme";

export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={CHART.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: CHART.cursorStroke }} />
        <Legend wrapperStyle={LEGEND_STYLE} />
        {/* Enquiries is the headline series and takes the brand blue; converted/lost keep green and
            red because their meaning is the direction, not the brand. */}
        <Line type="monotone" dataKey="enquiries" name="Enquiries" stroke={CHART.accent} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="converted" name="Converted" stroke={CHART.ok} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="lost" name="Lost" stroke={CHART.danger} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
