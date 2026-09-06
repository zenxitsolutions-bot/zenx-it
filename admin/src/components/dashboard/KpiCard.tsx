import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Soft pastel ground for the icon. One per metric, so a KPI row reads as a set of distinct
   *  tiles rather than six identical ones. The card itself always stays white. */
  tone?: "blue" | "purple" | "orange" | "green" | "red" | "neutral";
  /** Short line under the figure explaining what it counts. */
  description?: string;
  /** This period's and last period's figures. The card derives the change itself so a caller can't
   *  pass a percentage that disagrees with the numbers beside it. Omit both when the metric has no
   *  honest prior-period equivalent — a current-state count like "Follow-ups due" has none, and
   *  showing it a fabricated trend would be worse than showing it none. */
  current?: number;
  previous?: number;
  /** Whether a rise is good. Lost enquiries rising is not an improvement. */
  goodWhen?: "up" | "down";
  to?: string;
}

function Delta({ current, previous, goodWhen = "up" }: { current: number; previous: number; goodWhen?: "up" | "down" }) {
  // Growth from a zero baseline is undefined, not infinite — say what happened instead of printing
  // a meaningless percentage.
  if (previous === 0) {
    return (
      <span className="text-[11px] text-dim">
        {current === 0 ? "No activity last period" : "First activity this period"}
      </span>
    );
  }

  const pct = ((current - previous) / previous) * 100;
  const flat = Math.abs(pct) < 0.05;
  const up = pct > 0;
  const good = flat ? null : (up ? goodWhen === "up" : goodWhen === "down");
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <span className="flex items-center gap-1.5 text-[11px]">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 font-semibold",
          good === null && "bg-surface text-muted",
          good === true && "bg-ok/10 text-okInk",
          good === false && "bg-danger/10 text-dangerInk"
        )}
      >
        <Icon size={11} />
        {flat ? "0%" : `${Math.abs(pct).toFixed(0)}%`}
      </span>
      <span className="text-dim">vs last month</span>
    </span>
  );
}

const TONES: Record<string, string> = {
  blue: "bg-tintBlue text-lime",
  purple: "bg-tintPurple text-purple",
  orange: "bg-tintOrange text-[#A35700]",
  green: "bg-tintGreen text-okInk",
  red: "bg-tintRed text-dangerInk",
  neutral: "bg-surface text-muted",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  description,
  current,
  previous,
  goodWhen,
  to,
}: KpiCardProps) {
  const hasDelta = typeof current === "number" && typeof previous === "number";

  const body = (
    <Card interactive={Boolean(to)} className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl2 transition",
            TONES[tone] ?? TONES.blue
          )}
        >
          <Icon size={16} />
        </span>
      </div>

      <span className="font-display text-[30px] leading-none text-offwhite">{value}</span>

      <div className="mt-auto flex flex-col gap-1">
        {hasDelta ? (
          <Delta current={current} previous={previous} goodWhen={goodWhen} />
        ) : (
          description && <span className="text-[11px] text-dim">{description}</span>
        )}
      </div>
    </Card>
  );

  return to ? (
    <Link to={to} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/40 rounded-xl2">
      {body}
    </Link>
  ) : (
    body
  );
}
