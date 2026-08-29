import { Sparkles } from "lucide-react";
import type { TodaySummary } from "../../services/analytics";

export function TodayStrip({ today }: { today: TodaySummary }) {
  const items = [
    { label: "New Enquiries", value: today.newEnquiriesToday },
    { label: "Follow-ups", value: today.followupsToday },
    { label: "Overdue", value: today.overdueFollowups, warn: today.overdueFollowups > 0 },
    { label: "Calls Scheduled", value: today.callsScheduledToday },
  ];

  return (
    <div className="rounded-xl2 border border-lime/25 bg-gradient-to-r from-lime/[0.07] to-transparent p-5">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-lime">
        <Sparkles size={13} /> Today
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <span className={`font-display text-2xl ${item.warn ? "text-danger" : "text-offwhite"}`}>
              {item.value}
            </span>
            <span className="ml-2 text-xs text-muted">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
