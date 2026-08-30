import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/portal/shared/StatCard';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useDietitianOverview } from '@/hooks/useInsights';
import { useClients } from '@/hooks/useClients';
import { formatTime } from '@/lib/format';

const STATUS_VARIANT = { scheduled: 'default', completed: 'secondary', cancelled: 'outline' };

export function DietitianOverviewScreen() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useDietitianOverview();
  const clientsQuery = useClients();

  return (
    <div className="mx-auto max-w-5xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Today's focus</p>
          <h1 className="mt-1 text-3xl text-forest">Good to see you, {user.name.split(' ')[0]}</h1>
          <p className="mt-1 text-muted-foreground">Here's what's on today, and how your clients are doing.</p>
        </div>
        <Button asChild className="rounded-full bg-coral text-white hover:bg-coral/90">
          <Link to={`/${user.companySlug}/app/plan`}>Open plan builder →</Link>
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
          <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-3">
            <StatCard label="Calls today" value={data.todaysAppointments.length} tone="sage" />
            <StatCard label="Your clients" value={clientsQuery.data?.length ?? '—'} />
            <StatCard label="Recently logged progress" value={data.clientMomentum} tone="sage" />
          </div>

          <div className="grid gap-5 min-[900px]:grid-cols-2">
            <section className="rounded-card bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-xl">Today's calls</h2>
                <Link to={`/${user.companySlug}/app/calls`} className="text-sm font-semibold text-forest hover:underline">
                  View all →
                </Link>
              </div>

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
                    <div key={call._id} className="flex items-center gap-3 rounded-xl bg-cream p-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sage font-semibold text-forest">
                        {person?.name?.[0] ?? 'C'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm text-forest">{person?.name ?? 'Client'}</strong>
                        <span className="text-xs text-muted-foreground">{formatTime(call.scheduledAt)}</span>
                      </div>
                      <Badge variant={STATUS_VARIANT[call.status]} className="capitalize">
                        {call.status}
                      </Badge>
                    </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-card bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="text-xl">Your clients</h2>
                <Link to={`/${user.companySlug}/app/clients`} className="text-sm font-semibold text-forest hover:underline">
                  View all →
                </Link>
              </div>

              {clientsQuery.isLoading ? (
                <Skeleton className="mt-4 h-20 w-full" />
              ) : !clientsQuery.data?.length ? (
                <div className="mt-4">
                  <EmptyState title="No clients yet" description="Clients assigned to you will show up here." />
                </div>
              ) : (
                <div className="mt-4 grid gap-2">
                  {clientsQuery.data.slice(0, 4).map((client) => (
                    <div key={client._id} className="flex items-center gap-3 rounded-xl bg-cream p-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sage font-semibold text-forest">
                        {client.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm text-forest">{client.name}</strong>
                        <span className="text-xs text-muted-foreground">{client.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
