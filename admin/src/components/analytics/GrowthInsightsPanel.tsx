import { TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import type { GrowthInsights } from "../../services/analytics";
import { Card } from "../ui/Card";

export function GrowthInsightsPanel({ growth }: { growth: GrowthInsights }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <InsightCard label="Contact Rate" value={`${growth.contactRate.toFixed(0)}%`} message={growth.contactRateMessage} />
        <InsightCard
          label="Follow-up Conversion"
          value={`${growth.followupConversionRate.toFixed(0)}%`}
          message={growth.followupConversionMessage}
        />
        <InsightCard label="Lead Drop-off" value={`${growth.leadDropoffRate.toFixed(0)}%`} message={growth.leadDropoffMessage} warn />
      </div>

      <Card className="p-6">
        <h4 className="mb-4 font-display text-base text-offwhite">Source Performance</h4>
        <div className="flex flex-col gap-3">
          {growth.sourcePerformance.map((s) => (
            <div key={s.source} className="flex items-center justify-between text-sm">
              <span className="text-muted">{s.source}</span>
              <span className="flex items-center gap-2">
                <span className="text-offwhite">{s.conversionRate.toFixed(0)}%</span>
                {!s.sufficientSample && (
                  <span className="text-[10px] uppercase tracking-wider text-dim">({s.total} leads · insufficient data)</span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-lime">
              <TrendingUp size={13} /> Best Lead Source
            </p>
            <p className="mt-1 text-sm text-offwhite">{growth.bestSource ? growth.bestSource.source : "Not enough data yet"}</p>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-danger">
              <TrendingDown size={13} /> Lowest Performing Source
            </p>
            <p className="mt-1 text-sm text-offwhite">{growth.worstSource ? growth.worstSource.source : "Not enough data yet"}</p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-md border border-lime/25 bg-lime/5 p-4">
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-lime" />
          <p className="text-sm text-offwhite">{growth.sourceRecommendation}</p>
        </div>
      </Card>
    </div>
  );
}

function InsightCard({
  label,
  value,
  message,
  warn,
}: {
  label: string;
  value: string;
  message: string;
  warn?: boolean;
}) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-offwhite">{value}</p>
      <p className={`mt-2 text-xs ${warn ? "text-warn" : "text-dim"}`}>{message}</p>
    </Card>
  );
}
