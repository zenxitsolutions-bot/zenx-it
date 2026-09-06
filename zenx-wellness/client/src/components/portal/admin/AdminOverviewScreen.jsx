import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  UtensilsCrossed,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useAdminOverview } from '@/hooks/useInsights';
import { STATUS_CHIP } from '@/lib/enquiryStatus';
import { cn } from '@/lib/utils';
import { AdminKpiCard } from './AdminKpiCard';
import { AdminTodayStrip } from './AdminTodayStrip';
import { EnquiryStatusDonut } from './EnquiryStatusDonut';
import { EnquiryGrowthLineChart } from './EnquiryGrowthLineChart';

const RANGES = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '3m', label: 'Last 3 months', months: 3 },
  { id: '6m', label: 'Last 6 months', months: 6 },
];

function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatReceived(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AdminOverviewScreen() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useAdminOverview();
  const [range, setRange] = useState('6m');
  const base = `/${user.companySlug}/app`;
  const firstName = user.name.split(' ')[0];

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const series = useMemo(() => {
    if (!data) return [];
    const cfg = RANGES.find((r) => r.id === range);
    if (cfg.days) return (data.daily ?? []).slice(-cfg.days);
    return (data.monthly ?? []).slice(-(cfg.months || 6));
  }, [data, range]);

  const statusCounts = useMemo(() => {
    const counts = { new: 0, contacted: 0, 'follow-up': 0, converted: 0, closed: 0 };
    for (const row of data?.statusBreakdown ?? []) counts[row.status] = row.count;
    return counts;
  }, [data]);

  const months = data?.monthly ?? [];
  const cur = months.length ? months[months.length - 1] : undefined;
  const prev = months.length > 1 ? months[months.length - 2] : undefined;

  const actions = [
    { label: 'Add Enquiry', to: `${base}/enquiries`, icon: Plus },
    { label: 'Add User', to: `${base}/users?create=1`, icon: UserPlus },
    { label: 'Schedule Follow-up', to: `${base}/enquiries`, icon: CalendarClock },
    { label: 'Add Recipes', to: `${base}/recipes?create=1`, icon: UtensilsCrossed },
    { label: 'Create Plan', to: `${base}/plans?create=1`, icon: ClipboardList },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-7 min-[1050px]:px-9 min-[1050px]:py-9">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-forest">
            {greeting()}, {firstName}!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Here's what's happening with your business today.</p>
        </div>
        <div className="rounded-lg border border-line bg-white px-3.5 py-2 text-right">
          <p className="text-xs font-semibold text-forest">{todayLabel}</p>
          <p className="text-[11px] text-dim">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        </div>
      </div>

      {isLoading ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-card" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-card" />
        </>
      ) : isError ? (
        <EmptyState
          title="Couldn't load your overview"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : (
        <>
          <AdminTodayStrip today={data.today ?? { newEnquiriesToday: 0, followupsToday: data.followUpsToday, overdueFollowups: 0, callsScheduledToday: data.followUpsToday }} />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <AdminKpiCard
              label="Total Enquiries"
              tone="blue"
              value={String(data.kpis?.totalEnquiries ?? data.statusBreakdown?.reduce((sum, s) => sum + s.count, 0) ?? 0)}
              icon={Inbox}
              to={`${base}/enquiries`}
              current={cur?.enquiries}
              previous={prev?.enquiries}
              goodWhen="up"
            />
            <AdminKpiCard
              label="New Enquiries"
              tone="purple"
              value={String(data.kpis?.newEnquiries ?? data.newEnquiries)}
              icon={Sparkles}
              to={`${base}/enquiries`}
              description="Awaiting first contact"
            />
            <AdminKpiCard
              label="Follow-ups Due"
              tone="orange"
              value={String(data.kpis?.followupsDue ?? data.followUpsToday)}
              icon={CalendarClock}
              to={`${base}/enquiries`}
              description="Scheduled and not yet done"
            />
            <AdminKpiCard
              label="Converted"
              tone="green"
              value={String(data.kpis?.converted ?? 0)}
              icon={Trophy}
              to={`${base}/enquiries`}
              current={cur?.converted}
              previous={prev?.converted}
              goodWhen="up"
            />
            <AdminKpiCard
              label="Conversion Rate"
              tone="blue"
              value={`${Number(data.kpis?.conversionRate ?? data.conversionRate).toFixed(1)}%`}
              icon={TrendingUp}
              current={cur ? Math.round(cur.conversionRate) : undefined}
              previous={prev ? Math.round(prev.conversionRate) : undefined}
              goodWhen="up"
            />
            <AdminKpiCard
              label="Lost"
              tone="red"
              value={String(data.kpis?.lost ?? 0)}
              icon={XCircle}
              to={`${base}/enquiries`}
              current={cur?.lost}
              previous={prev?.lost}
              goodWhen="down"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-white p-4 shadow-soft">
            <span className="mr-1 text-[11px] font-semibold tracking-wider text-dim uppercase">Quick actions</span>
            {actions.map((a) => (
              <Button key={a.label} asChild variant="outline" size="sm">
                <Link to={a.to}>
                  <a.icon size={14} />
                  {a.label}
                </Link>
              </Button>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_1.35fr]">
            <section className="rounded-card border border-line bg-white p-5 shadow-soft">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-[15px] text-forest">Enquiry status</h3>
                  <p className="text-xs text-muted-foreground">Pipeline breakdown</p>
                </div>
                <Link to={`${base}/enquiries`} className="flex items-center gap-1 text-xs font-medium text-coral hover:underline">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <EnquiryStatusDonut counts={statusCounts} companySlug={user.companySlug} />
            </section>

            <section className="rounded-card border border-line bg-white p-5 shadow-soft">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-[15px] text-forest">Growth</h3>
                  <p className="text-xs text-muted-foreground">Enquiries, conversions and losses over time</p>
                </div>
                <div className="flex flex-wrap gap-1 rounded-lg bg-cream p-1">
                  {RANGES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRange(r.id)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                        range === r.id ? 'bg-white text-forest shadow-sm' : 'text-muted-foreground hover:text-forest'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <EnquiryGrowthLineChart data={series} />
            </section>
          </div>

          <section className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between p-5 pb-4">
              <h3 className="font-display text-[15px] text-forest">Recent enquiries</h3>
              <Link to={`${base}/enquiries`} className="flex items-center gap-1 text-xs font-medium text-coral hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            {(data.recentEnquiries ?? []).length === 0 ? (
              <p className="px-5 pt-4 pb-10 text-center text-sm text-dim">No enquiries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-y border-line bg-cream/60 text-left text-[10px] tracking-wider text-dim uppercase">
                      <th className="px-5 py-2.5 font-semibold">Name</th>
                      <th className="px-3 py-2.5 font-semibold">Contact</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentEnquiries.map((e) => (
                      <tr key={e._id} className="border-b border-line/70 transition last:border-0 hover:bg-cream/70">
                        <td className="px-5 py-3">
                          <Link to={`${base}/enquiries`} className="font-medium text-forest hover:text-coral">
                            {e.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-muted-foreground">{e.email}</p>
                          {e.phone && <p className="text-[11px] text-dim">{e.phone}</p>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn('inline-flex rounded-pill px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase', STATUS_CHIP[e.status])}>
                            {e.status === 'closed' ? 'Lost' : e.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-dim">{formatReceived(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
