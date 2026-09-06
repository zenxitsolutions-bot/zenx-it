import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Inbox,
  Sparkles,
  CalendarClock,
  Trophy,
  TrendingUp,
  XCircle,
  ArrowRight,
  Plus,
  UserPlus,
  LayoutGrid,
  ShieldCheck,
  Phone,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useLiveQuery } from "../hooks/useLiveQuery";
import { analyticsService, computeDailySeries } from "../services/analytics";
import { auditService } from "../services/auditLogs";
import { adminUsersService } from "../services/adminUsers";
import { followupsService } from "../services/followups";
import { KpiCard } from "../components/dashboard/KpiCard";
import { TodayStrip } from "../components/dashboard/TodayStrip";
import { StatusDonut } from "../components/dashboard/StatusDonut";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { MonthlyTrendChart } from "../components/analytics/MonthlyTrendChart";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/Badges";
import { SkeletonCards, SkeletonPanels } from "../components/ui/Skeleton";
import { cn } from "../utils/cn";
import type { EnquiryStatus } from "../types/domain";
import { formatDateShort, formatTime, greeting, isOverdue } from "../utils/date";

const RANGES = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "3m", label: "Last 3 months", months: 3 },
  { id: "6m", label: "Last 6 months", months: 6 },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

const QUICK_ACTIONS = [
  { label: "Add Enquiry", to: "/admin/enquiries", icon: Plus },
  { label: "Add Customer", to: "/admin/customers", icon: UserPlus },
  { label: "Schedule Follow-up", to: "/admin/follow-ups", icon: CalendarClock },
  { label: "Add Application", to: "/admin/applications", icon: LayoutGrid },
  { label: "Create Admin User", to: "/admin/users", icon: ShieldCheck, roles: ["Super Admin", "Admin"] },
];

export default function DashboardPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [range, setRange] = useState<RangeId>("6m");

  // Audit logs drive the activity feed. The sidebar hides the Audit Logs page from Sales and
  // Support, so the feed follows the same rule — the API would serve them (it only checks
  // authentication), but surfacing the same records on the dashboard would quietly widen an access
  // boundary the navigation deliberately draws.
  const canSeeActivity = profile?.role === "Super Admin" || profile?.role === "Admin";

  const { data, loading, refresh } = useLiveQuery(
    async () => {
      const [core, logs, admins] = await Promise.all([
        analyticsService.load(),
        canSeeActivity ? auditService.list() : Promise.resolve([]),
        canSeeActivity ? adminUsersService.list() : Promise.resolve([]),
      ]);
      return { ...core, logs, admins };
    },
    [canSeeActivity],
    { tables: ["enquiries", "followups"] }
  );

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const series = useMemo(() => {
    if (!data) return [];
    const cfg = RANGES.find((r) => r.id === range)!;
    if ("days" in cfg && cfg.days) {
      return computeDailySeries(data.enquiries, data.followups, cfg.days);
    }
    // The monthly series is precomputed over 6 months; a shorter range is its tail.
    return data.monthly.slice(-(("months" in cfg && cfg.months) || 6));
  }, [data, range]);

  const statusCounts = useMemo(() => {
    const base: Record<EnquiryStatus, number> = { NEW: 0, CONTACTED: 0, FOLLOW_UP: 0, CONVERTED: 0, LOST: 0 };
    for (const e of data?.enquiries ?? []) base[e.status] = (base[e.status] ?? 0) + 1;
    return base;
  }, [data]);

  // Month-over-month comparison, taken from the same monthly series the growth chart plots. Metrics
  // that are a snapshot of current state rather than a flow (New enquiries, Follow-ups due) get no
  // delta — there is no prior-period figure for them that would mean anything.
  const months = data?.monthly ?? [];
  const cur = months.length ? months[months.length - 1] : undefined;
  const prev = months.length > 1 ? months[months.length - 2] : undefined;

  const enquiryById = useMemo(
    () => new Map((data?.enquiries ?? []).map((e) => [e.id, e])),
    [data]
  );

  const upcomingFollowups = useMemo(
    () =>
      (data?.followups ?? [])
        .filter((f) => f.status === "SCHEDULED")
        .sort((a, b) => +new Date(`${a.scheduled_date}T${a.scheduled_time}`) - +new Date(`${b.scheduled_date}T${b.scheduled_time}`))
        .slice(0, 5),
    [data]
  );

  const recentEnquiries = useMemo(
    () =>
      [...(data?.enquiries ?? [])]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 6),
    [data]
  );

  const completeFollowup = async (id: string) => {
    await followupsService.complete(id);
    toast("Follow-up completed");
    refresh();
  };

  const actions = QUICK_ACTIONS.filter((a) => !a.roles || (profile && a.roles.includes(profile.role)));

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-offwhite">
            {greeting()}, {profile?.first_name ?? "Admin"}!
          </h2>
          <p className="mt-1 text-sm text-muted">Here's what's happening with your business today.</p>
        </div>
        <div className="rounded-lg border border-border bg-panel px-3.5 py-2 text-right">
          <p className="text-xs font-semibold text-offwhite">{today}</p>
          <p className="text-[11px] text-dim">
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </div>
      </div>

      {loading || !data ? (
        <>
          <SkeletonCards count={6} />
          <SkeletonPanels />
        </>
      ) : (
        <>
          <TodayStrip today={data.today} />

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Total Enquiries"
          tone="blue"
              value={String(data.kpis.totalEnquiries)}
              icon={Inbox}
              to="/admin/enquiries"
              current={cur?.enquiries}
              previous={prev?.enquiries}
              goodWhen="up"
            />
            <KpiCard
              label="New Enquiries"
          tone="purple"
              value={String(data.kpis.newEnquiries)}
              icon={Sparkles}
              to="/admin/enquiries?status=NEW"
              description="Awaiting first contact"
            />
            <KpiCard
              label="Follow-ups Due"
          tone="orange"
              value={String(data.kpis.followupsDue)}
              icon={CalendarClock}
              to="/admin/follow-ups"
              description="Scheduled and not yet done"
            />
            <KpiCard
              label="Converted"
          tone="green"
              value={String(data.kpis.converted)}
              icon={Trophy}
              to="/admin/enquiries?status=CONVERTED"
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
              label="Lost"
          tone="red"
              value={String(data.kpis.lost)}
              icon={XCircle}
              to="/admin/enquiries?status=LOST"
              current={cur?.lost}
              previous={prev?.lost}
              goodWhen="down"
            />
          </div>

          {/* Quick actions */}
          <Card className="flex flex-wrap items-center gap-2 p-4">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-dim">Quick actions</span>
            {actions.map((a) => (
              <Link key={a.label} to={a.to}>
                <Button variant="secondary" size="sm">
                  <a.icon size={14} />
                  {a.label}
                </Button>
              </Link>
            ))}
          </Card>

          {/* Analytics */}
          <div className="grid gap-5 xl:grid-cols-[1fr_1.35fr]">
            <Card className="p-5">
              <CardHeader
                title="Enquiry status"
                subtitle="Pipeline breakdown"
                action={
                  <Link to="/admin/enquiries" className="flex items-center gap-1 text-xs font-medium text-lime hover:underline">
                    View all <ArrowRight size={12} />
                  </Link>
                }
                className="mb-5"
              />
              <StatusDonut counts={statusCounts} />
            </Card>

            <Card className="p-5">
              <CardHeader
                title="Growth"
                subtitle="Enquiries, conversions and losses over time"
                className="mb-4"
                action={
                  <div className="flex flex-wrap gap-1 rounded-lg bg-surface p-1">
                    {RANGES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setRange(r.id)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
                          range === r.id ? "bg-panel text-offwhite shadow-sm" : "text-muted hover:text-offwhite"
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                }
              />
              <MonthlyTrendChart data={series} />
            </Card>
          </div>

          {/* Recent enquiries + activity */}
          <div className={cn("grid gap-5", canSeeActivity && "xl:grid-cols-[1.5fr_1fr]")}>
            <Card className="overflow-hidden">
              <CardHeader
                title="Recent enquiries"
                action={
                  <Link to="/admin/enquiries" className="flex items-center gap-1 text-xs font-medium text-lime hover:underline">
                    View all <ArrowRight size={12} />
                  </Link>
                }
                className="p-5 pb-4"
              />
              {recentEnquiries.length === 0 ? (
                <p className="px-5 pb-10 pt-4 text-center text-sm text-dim">No enquiries yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-y border-border bg-surface/60 text-left text-[10px] uppercase tracking-wider text-dim">
                        <th className="px-5 py-2.5 font-semibold">Company</th>
                        <th className="px-3 py-2.5 font-semibold">Contact</th>
                        <th className="px-3 py-2.5 font-semibold">Status</th>
                        <th className="px-5 py-2.5 text-right font-semibold">Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEnquiries.map((e) => (
                        <tr key={e.id} className="border-b border-border/70 transition last:border-0 hover:bg-surface/70">
                          <td className="px-5 py-3">
                            <Link to={`/admin/enquiries/${e.id}`} className="font-medium text-offwhite hover:text-lime">
                              {e.company_name}
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-muted">{e.contact_name}</p>
                            <p className="text-[11px] text-dim">{e.email}</p>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={e.status} />
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-dim">{formatDateShort(e.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {canSeeActivity && (
              <Card className="p-5">
                <CardHeader
                  title="Recent activity"
                  action={
                    <Link to="/admin/audit-logs" className="flex items-center gap-1 text-xs font-medium text-lime hover:underline">
                      View all <ArrowRight size={12} />
                    </Link>
                  }
                  className="mb-3"
                />
                <ActivityFeed logs={data.logs.slice(0, 8)} admins={data.admins} />
              </Card>
            )}
          </div>

          {/* Upcoming follow-ups */}
          <Card className="p-5">
            <CardHeader
              title="Upcoming follow-ups"
              subtitle="Next five scheduled"
              action={
                <Link to="/admin/follow-ups" className="flex items-center gap-1 text-xs font-medium text-lime hover:underline">
                  See all <ArrowRight size={12} />
                </Link>
              }
              className="mb-4"
            />
            {upcomingFollowups.length === 0 ? (
              <p className="py-10 text-center text-sm text-dim">No follow-ups scheduled.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcomingFollowups.map((f) => {
                  const enq = enquiryById.get(f.enquiry_id);
                  const overdue = isOverdue(f.scheduled_date, f.scheduled_time);
                  return (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-4 py-3 transition hover:border-borderStrong hover:bg-surface/60"
                    >
                      <div
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                          overdue ? "bg-danger/10 text-dangerInk" : "bg-lime/10 text-lime"
                        )}
                      >
                        {overdue ? <AlertTriangle size={15} /> : <CalendarClock size={15} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/admin/enquiries/${f.enquiry_id}`}
                          className="block truncate text-sm font-medium text-offwhite hover:text-lime"
                        >
                          {enq?.company_name ?? "Unknown"}
                        </Link>
                        <p className="truncate text-xs text-dim">
                          {enq?.contact_name}
                          {enq?.phone && ` · ${enq.phone}`}
                          {` · ${f.contact_method}`}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={cn("text-xs font-semibold", overdue ? "text-dangerInk" : "text-offwhite")}>
                          {formatDateShort(f.scheduled_date)} · {formatTime(`${f.scheduled_date}T${f.scheduled_time}`)}
                        </p>
                        {overdue && <p className="text-[10px] font-semibold text-dangerInk">Overdue</p>}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {enq?.phone && (
                          <a href={`tel:${enq.phone}`} title={`Call ${enq.contact_name}`}>
                            <Button variant="secondary" size="sm" aria-label="Call">
                              <Phone size={13} />
                            </Button>
                          </a>
                        )}
                        {/* Reschedule lives on the enquiry, where the existing scheduling flow and
                            its validation already are — duplicating it here would risk creating a
                            second follow-up instead of moving this one. */}
                        <Link to={`/admin/enquiries/${f.enquiry_id}`}>
                          <Button variant="secondary" size="sm">Reschedule</Button>
                        </Link>
                        <Button variant="secondary" size="sm" onClick={() => completeFollowup(f.id)} aria-label="Complete">
                          <Check size={13} />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
