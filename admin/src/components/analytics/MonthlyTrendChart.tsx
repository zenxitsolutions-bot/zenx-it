import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonthlyPoint } from "../../services/analytics";

const TOOLTIP_STYLE = {
  background: "#151613",
  border: "1px solid #ffffff22",
  borderRadius: 8,
  fontSize: 12,
  color: "#f4f1e9",
};

export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#ffffff12" vertical={false} />
        <XAxis dataKey="label" stroke="#6f716b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#6f716b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "#ffffff22" }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#a4a59e" }} />
        <Line type="monotone" dataKey="enquiries" name="Enquiries" stroke="#d7ff42" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="converted" name="Converted" stroke="#7fe08a" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="lost" name="Lost" stroke="#ff6b6b" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
