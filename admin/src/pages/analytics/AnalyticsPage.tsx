import { Inbox, PhoneCall, Trophy, XCircle, TrendingUp, Timer } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { analyticsService } from "../../services/analytics";
import { Card, CardHeader } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { SkeletonCards, SkeletonPanels } from "../../components/ui/Skeleton";
import { ConversionFunnel } from "../../components/analytics/ConversionFunnel";
import { MonthlyTrendChart } from "../../components/analytics/MonthlyTrendChart";
import { FollowupsBarChart } from "../../components/analytics/FollowupsBarChart";
import { SourceDonutChart } from "../../components/analytics/SourceDonutChart";
import { ServicePerformanceList } from "../../components/analytics/ServicePerformanceList";
import { GrowthInsightsPanel } from "../../components/analytics/GrowthInsightsPanel";

/** Hours read badly once they run into days; switch unit at the point it stops being readable. */
function formatDuration(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function AnalyticsPage() {
  const { data, loading } = useLiveQuery(() => analyticsService.load(), [], {
    tables: ["enquiries", "followups"],
  });

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-5">
        <SkeletonCards count={6} />
        <SkeletonPanels />
      </div>
    );
  }

  const contactedCount = data.funnel.find((f) => f.stage === "Contacted")?.count ?? 0;
  const months = data.monthly;
  const cur = months.length ? months[months.length - 1] : undefined;
  const prev = months.length > 1 ? months[months.length - 2] : undefined;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader description="Business conversion and performance analytics, computed from live enquiry data." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Enquiries"
          tone="blue"
          value={String(data.kpis.totalEnquiries)}
          icon={Inbox}
          current={cur?.enquiries}
          previous={prev?.enquiries}
          goodWhen="up"
        />
        <KpiCard label="Contacted"
          tone="purple" value={String(contactedCount)} icon={PhoneCall} description="Reached at least once" />
        <KpiCard
          label="Converted"
          tone="green"
          value={String(data.kpis.converted)}
          icon={Trophy}
          current={cur?.converted}
          previous={prev?.converted}
          goodWhen="up"
        />
        <KpiCard
          label="Conversion Rate"
          tone="blue"
          value={`${data.kpis.conversionRate.toFixed(1)}%`}
          icon={TrendingUp}
          current={cur ? Math.round(cur.conversionRate) : undefined}
          previous={prev ? Math.round(prev.conversionRate) : undefined}
          goodWhen="up"
        />
        <KpiCard
          label="Lost Rate"
          tone="red"
          value={`${data.response.lostRate.toFixed(1)}%`}
          icon={XCircle}
          current={cur?.lost}
          previous={prev?.lost}
          goodWhen="down"
        />
        <KpiCard
          label="Avg Follow-up Time"
          tone="orange"
          value={formatDuration(data.response.avgFollowupHours)}
          icon={Timer}
          description={
            data.response.followupSample
              ? `Across ${data.response.followupSample} enquir${data.response.followupSample === 1 ? "y" : "ies"}`
              : "No follow-ups booked yet"
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <CardHeader title="Conversion funnel" subtitle="Where enquiries drop out" className="mb-5" />
          <ConversionFunnel stages={data.funnel} />
        </Card>

        <Card className="p-5">
          <CardHeader title="Lead sources" subtitle="Where enquiries come from" className="mb-5" />
          {data.sourcePerformance.length === 0 ? (
            <p className="py-10 text-center text-sm text-dim">No source data yet.</p>
          ) : (
            <SourceDonutChart data={data.sourcePerformance} />
          )}
        </Card>
      </div>

      <Card className="p-5">
        <CardHeader
          title="Conversion trends"
          subtitle="Enquiries, conversions and losses over the last 6 months"
          className="mb-5"
        />
        <MonthlyTrendChart data={data.monthly} />
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <CardHeader title="Follow-ups per month" className="mb-5" />
          <FollowupsBarChart data={data.monthly} />
        </Card>

        <Card className="p-5">
          <CardHeader title="Service performance" className="mb-5" />
          {data.servicePerformance.length === 0 ? (
            <p className="py-10 text-center text-sm text-dim">No service data yet.</p>
          ) : (
            <ServicePerformanceList data={data.servicePerformance} />
          )}
        </Card>
      </div>

      <div>
        <h3 className="mb-3 font-display text-base text-offwhite">Growth insights</h3>
        <GrowthInsightsPanel growth={data.growth} />
      </div>
    </div>
  );
}
