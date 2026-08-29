import { Link } from "react-router-dom";
import { Inbox, Sparkles, CalendarClock, Trophy, TrendingUp, XCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { analyticsService } from "../services/analytics";
import { KpiCard } from "../components/dashboard/KpiCard";
import { TodayStrip } from "../components/dashboard/TodayStrip";
import { Card } from "../components/ui/Card";
import { SkeletonCards } from "../components/ui/Skeleton";
import { STATUS_LABELS, type EnquiryStatus } from "../types/domain";
import { formatDateShort, formatTime, greeting, isOverdue } from "../utils/date";

const STAGE_ORDER: EnquiryStatus[] = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "LOST"];

export default function DashboardPage() {
  const { profile } = useAuth();
  const { data, loading } = useLiveQuery(
    () => analyticsService.load(),
    [],
    { tables: ["enquiries", "followups"] }
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const upcomingFollowups = (data?.followups ?? [])
    .filter((f) => f.status === "SCHEDULED")
    .slice(0, 5);

  const enquiryById = new Map((data?.enquiries ?? []).map((e) => [e.id, e]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl text-offwhite">
          {greeting()}, {profile?.first_name ?? "Admin"}.
        </h2>
        <p className="text-sm text-muted">{today}</p>
      </div>

      {loading || !data ? (
        <>
          <SkeletonCards count={4} />
          <SkeletonCards count={6} />
        </>
      ) : (
        <>
          <TodayStrip today={data.today} />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Total Enquiries" value={String(data.kpis.totalEnquiries)} icon={Inbox} />
            <KpiCard label="New Enquiries" value={String(data.kpis.newEnquiries)} icon={Sparkles} accent />
            <KpiCard label="Follow-ups Due" value={String(data.kpis.followupsDue)} icon={CalendarClock} />
            <KpiCard label="Converted" value={String(data.kpis.converted)} icon={Trophy} accent />
            <KpiCard label="Conversion Rate" value={`${data.kpis.conversionRate.toFixed(1)}%`} icon={TrendingUp} />
            <KpiCard label="Lost" value={String(data.kpis.lost)} icon={XCircle} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base text-offwhite">Pipeline overview</h3>
                <Link to="/admin/enquiries" className="flex items-center gap-1 text-xs text-lime hover:underline">
                  View pipeline <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {STAGE_ORDER.map((status) => {
                  const count = data.enquiries.filter((e) => e.status === status).length;
                  return (
                    <Link
                      key={status}
                      to={`/admin/enquiries?status=${status}`}
                      className="rounded-md border border-border px-3 py-4 text-center transition hover:border-lime/40 hover:bg-white/5"
                    >
                      <span className="block font-display text-2xl text-offwhite">{count}</span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-dim">
                        {STATUS_LABELS[status]}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base text-offwhite">Upcoming follow-ups</h3>
                <Link to="/admin/follow-ups" className="flex items-center gap-1 text-xs text-lime hover:underline">
                  See all <ArrowRight size={12} />
                </Link>
              </div>
              {upcomingFollowups.length === 0 ? (
                <p className="py-8 text-center text-sm text-dim">No follow-ups scheduled.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcomingFollowups.map((f) => {
                    const enq = enquiryById.get(f.enquiry_id);
                    const overdue = isOverdue(f.scheduled_date, f.scheduled_time);
                    return (
                      <Link
                        key={f.id}
                        to={`/admin/enquiries/${f.enquiry_id}`}
                        className="flex items-center justify-between rounded-md border border-border px-3.5 py-3 transition hover:border-lime/40 hover:bg-white/5"
                      >
                        <div>
                          <p className="text-sm text-offwhite">{enq?.company_name ?? "Unknown"}</p>
                          <p className="text-xs text-dim">{enq?.contact_name}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${overdue ? "text-danger" : "text-lime"}`}>
                            {formatDateShort(f.scheduled_date)} · {formatTime(`${f.scheduled_date}T${f.scheduled_time}`)}
                          </p>
                          {overdue && <p className="text-[10px] text-danger">Overdue</p>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
