import { Inbox, PhoneCall, CalendarClock, Trophy, XCircle, TrendingUp } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { analyticsService } from "../../services/analytics";
import { Card } from "../../components/ui/Card";
import { KpiCard } from "../../components/dashboard/KpiCard";
import { SkeletonCards, SkeletonRows } from "../../components/ui/Skeleton";
import { ConversionFunnel } from "../../components/analytics/ConversionFunnel";
import { MonthlyTrendChart } from "../../components/analytics/MonthlyTrendChart";
import { FollowupsBarChart } from "../../components/analytics/FollowupsBarChart";
import { SourceDonutChart } from "../../components/analytics/SourceDonutChart";
import { ServicePerformanceList } from "../../components/analytics/ServicePerformanceList";
import { GrowthInsightsPanel } from "../../components/analytics/GrowthInsightsPanel";

export default function AnalyticsPage() {
  const { data, loading } = useLiveQuery(
    () => analyticsService.load(),
    [],
    { tables: ["enquiries", "followups"] }
  );

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <SkeletonCards count={6} />
        <SkeletonRows rows={5} />
      </div>
    );
  }

  const contactedCount = data.funnel.find((f) => f.stage === "Contacted")?.count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl text-offwhite">How is ZenX performing?</h2>
        <p className="text-sm text-muted">Business conversion and performance analytics, computed from live enquiry data.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Enquiries" value={String(data.kpis.totalEnquiries)} icon={Inbox} />
        <KpiCard label="Contacted" value={String(contactedCount)} icon={PhoneCall} />
        <KpiCard label="Follow-ups" value={String(data.funnel.find((f) => f.stage === "Follow-up")?.count ?? 0)} icon={CalendarClock} />
        <KpiCard label="Converted" value={String(data.kpis.converted)} icon={Trophy} accent />
        <KpiCard label="Conversion Rate" value={`${data.kpis.conversionRate.toFixed(1)}%`} icon={TrendingUp} />
        <KpiCard label="Lost" value={String(data.kpis.lost)} icon={XCircle} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <h3 className="mb-5 font-display text-base text-offwhite">Conversion Funnel</h3>
          <ConversionFunnel stages={data.funnel} />
        </Card>

        <Card className="p-6">
          <h3 className="mb-5 font-display text-base text-offwhite">Lead Sources</h3>
          {data.sourcePerformance.length === 0 ? (
            <p className="py-10 text-center text-sm text-dim">No source data yet.</p>
          ) : (
            <SourceDonutChart data={data.sourcePerformance} />
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="mb-5 font-display text-base text-offwhite">Enquiries, Conversions &amp; Lost (last 6 months)</h3>
        <MonthlyTrendChart data={data.monthly} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <h3 className="mb-5 font-display text-base text-offwhite">Follow-ups per Month</h3>
          <FollowupsBarChart data={data.monthly} />
        </Card>

        <Card className="p-6">
          <h3 className="mb-5 font-display text-base text-offwhite">Service Performance</h3>
          {data.servicePerformance.length === 0 ? (
            <p className="py-10 text-center text-sm text-dim">No service data yet.</p>
          ) : (
            <ServicePerformanceList data={data.servicePerformance} />
          )}
        </Card>
      </div>

      <div>
        <h2 className="mb-4 font-display text-xl text-offwhite">Growth Insights</h2>
        <GrowthInsightsPanel growth={data.growth} />
      </div>
    </div>
  );
}
