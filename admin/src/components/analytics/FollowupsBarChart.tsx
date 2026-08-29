import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { MonthlyPoint } from "../../services/analytics";

const TOOLTIP_STYLE = {
  background: "#151613",
  border: "1px solid #ffffff22",
  borderRadius: 8,
  fontSize: 12,
  color: "#f4f1e9",
};

export function FollowupsBarChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#ffffff12" vertical={false} />
        <XAxis dataKey="label" stroke="#6f716b" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#6f716b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#ffffff08" }} />
        <Bar dataKey="followups" name="Follow-ups" fill="#d7ff42" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
