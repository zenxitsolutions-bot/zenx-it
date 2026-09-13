import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import { TOOLTIP_STYLE } from "../../lib/chartTheme";
import { STATUS_LABELS, type EnquiryStatus } from "../../types/domain";

/* Stage colors are the semantic tokens, not the categorical chart series: these five slices mean
   something (new / in progress / won / lost), so they should match the status badges the user sees
   on every table row. Reusing SERIES here would have coloured "Lost" with whatever hue happened to
   sit at that index. */
const STAGE_COLOR: Record<EnquiryStatus, string> = {
  NEW: "#3478D8", // blue
  CONTACTED: "#7C5CE1", // purple
  FOLLOW_UP: "#F59E42", // orange
  CONVERTED: "#22A06B", // green
  LOST: "#E85D5D", // red
};

const ORDER: EnquiryStatus[] = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "LOST"];

export function StatusDonut({ counts }: { counts: Record<EnquiryStatus, number> }) {
  const data = ORDER.map((s) => ({ status: s, name: STATUS_LABELS[s], value: counts[s] ?? 0 }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <p className="py-12 text-center text-sm text-dim">No enquiries yet.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.status} fill={STAGE_COLOR[d.status]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
        {/* Centre total. pointer-events-none so it never swallows a hover meant for a slice. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[28px] leading-none text-offwhite">{total}</span>
          <span className="mt-1 text-[10px] uppercase tracking-widest text-dim">Total</span>
        </div>
      </div>

      <ul className="flex w-full flex-1 flex-col gap-1">
        {data.map((d) => (
          <li key={d.status}>
            <Link
              to={`/admin/enquiries?status=${d.status}`}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-surface"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: STAGE_COLOR[d.status] }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-sm text-muted">{d.name}</span>
              <span className="text-sm font-semibold text-offwhite">{d.value}</span>
              <span className="w-10 text-right text-xs text-dim">
                {total ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
