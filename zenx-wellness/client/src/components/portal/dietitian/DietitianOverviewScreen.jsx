import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/portal/shared/StatCard';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useDietitianOverview } from '@/hooks/useInsights';
import { useClients } from '@/hooks/useClients';
import { formatRelativeDay, formatTime } from '@/lib/format';
import { ClientProgressChart } from './ClientProgressChart';
import { PlansOverviewChart } from './PlansOverviewChart';

const STATUS_VARIANT = { scheduled: 'default', completed: 'secondary', cancelled: 'outline' };

function SectionHeader({ title, subtitle, to, linkLabel }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-xl">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="text-sm font-semibold text-forest hover:underline">
          {linkLabel ?? 'View all'} →
        </Link>
      )}
    </div>
  );
}

function PersonRow({ initial, name, meta, trailing }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-cream p-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sage font-semibold text-forest">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm text-forest">{name}</strong>
        <span className="text-xs text-muted-foreground">{meta}</span>
      </div>
      {trailing}
    </div>
  );
}

export function DietitianOverviewScreen() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useDietitianOverview();
  const clientsQuery = useClients();

  const appHref = (path) => `/${user.companySlug}/app/${path}`;

  // Sorted here rather than server-side: the clients list is already fetched for the roster count,
  // and a dietitian's own caseload is small enough that a second "recent clients" endpoint would
  // be pure overhead.
  const recentClients = [...(clientsQuery.data ?? [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Today's focus</p>
          <h1 className="mt-1 text-3xl text-forest">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-muted-foreground">Here's what's on today, and how your clients are doing.</p>
        </div>
        <Button asChild className="rounded-full bg-coral text-white hover:bg-coral/90">
          <Link to={appHref('plan')}>Open plan builder →</Link>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load your dashboard"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : (
        <div className="grid gap-5">
          <div className="grid gap-3 min-[700px]:grid-cols-3">
            <StatCard
              label="Total clients"
              value={data.stats.clients.total}
              size="lg"
              delta={data.stats.clients.changePct}
              deltaHint={`Compared with ${data.stats.clients.windowDays} days ago`}
              hint={`${data.stats.clients.addedThisWindow} joined in the last ${data.stats.clients.windowDays} days`}
            />
            <StatCard
              label="Today's appointments"
              value={data.stats.appointmentsToday.total}
              size="lg"
              delta={data.stats.appointmentsToday.changePct}
              deltaHint="Compared with the same weekday last week"
              hint={`${data.stats.appointmentsToday.sameDayLastWeek} on this day last week`}
            />
            <StatCard
              label="Active plans"
              value={data.stats.activePlans.total}
              size="lg"
              delta={data.stats.activePlans.changePct}
              deltaHint={`Publishing volume vs the previous ${data.stats.activePlans.windowDays} days`}
              hint={`${data.stats.activePlans.publishedThisWindow} published in the last ${data.stats.activePlans.windowDays} days`}
            />
          </div>

          <div className="grid gap-5 min-[900px]:grid-cols-2">
            <section className="rounded-card border border-line bg-white p-6 shadow-soft">
              <SectionHeader title="Today's appointments" to={appHref('calls')} />

              {data.todaysAppointments.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No calls today" description="Enjoy the breathing room." />
                </div>
              ) : (
                <div className="mt-4 grid gap-2">
                  {data.todaysAppointments.map((call) => {
                    // A follow-up call booked directly against an enquiry (spec
                    // §2026-round2-fixes item 1) has no client yet — fall back to the enquiry's
                    // name rather than a generic "Client" placeholder.
                    const person = call.client ?? call.enquiry;
                    return (
                      <PersonRow
                        key={call._id}
                        initial={person?.name?.[0] ?? 'C'}
                        name={person?.name ?? 'Client'}
                        meta={formatTime(call.scheduledAt)}
                        trailing={
                          <Badge variant={STATUS_VARIANT[call.status]} className="capitalize">
                            {call.status}
                          </Badge>
                        }
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-card border border-line bg-white p-6 shadow-soft">
              <SectionHeader
                title="Client progress"
                subtitle="Entries your clients logged over the last 7 days"
                to={appHref('clients')}
                linkLabel="View clients"
              />
              <div className="mt-2">
                <ClientProgressChart data={data.progressSeries} />
              </div>
            </section>

            <section className="rounded-card border border-line bg-white p-6 shadow-soft">
              <SectionHeader title="Recent clients" to={appHref('clients')} />

              {clientsQuery.isLoading ? (
                <Skeleton className="mt-4 h-20 w-full" />
              ) : recentClients.length === 0 ? (
                <div className="mt-4">
                  <EmptyState title="No clients yet" description="Clients assigned to you will show up here." />
                </div>
              ) : (
                <div className="mt-4 grid gap-2">
                  {recentClients.map((client) => (
                    <PersonRow
                      key={client._id}
                      initial={client.name[0]}
                      name={client.name}
                      meta={client.email}
                      trailing={
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelativeDay(client.createdAt)}
                        </span>
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-card border border-line bg-white p-6 shadow-soft">
              <SectionHeader
                title="Plans overview"
                subtitle="Active covers this week onwards; completed weeks have ended"
                to={appHref('plans')}
                linkLabel="View plans"
              />
              <div className="mt-4">
                <PlansOverviewChart breakdown={data.planBreakdown} />
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
