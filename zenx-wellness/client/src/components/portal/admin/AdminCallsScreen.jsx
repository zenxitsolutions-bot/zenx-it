import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PhoneOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { CallTabs } from '@/components/portal/shared/CallTabs';
import { CallListFilters } from '@/components/portal/shared/CallListFilters';
import { DietitianCallCard } from '@/components/portal/dietitian/DietitianCallCard';
import { useAuth } from '@/hooks/useAuth';
import { useCalls } from '@/hooks/useCalls';
import { useDietitians } from '@/hooks/useClients';
import { useUsers } from '@/hooks/useUsers';
import { filterCalls, groupCallsByTab } from '@/lib/clientPortal';
import { cn } from '@/lib/utils';
import { AdminCallRescheduleDialog } from './AdminCallRescheduleDialog';

const FILTERS = [
  { id: 'enquiry', label: 'Enquiry leads' },
  { id: 'client', label: 'Client check-ins' },
  { id: 'all', label: 'All calls' },
];

const EMPTY = {
  all: { title: 'No calls yet', description: 'Follow-up calls booked from the enquiry pipeline will show up here.' },
  upcoming: { title: 'No upcoming calls', description: 'Move a lead to Follow-up on the enquiry pipeline to book a call.' },
  finished: { title: 'No finished calls', description: 'Completed and past calls will collect here.' },
  cancelled: { title: 'No cancelled calls', description: 'Nothing has been called off.' },
};

function matchesKind(call, kind) {
  if (kind === 'enquiry') return Boolean(call.enquiry);
  if (kind === 'client') return Boolean(call.client);
  return true;
}

function mergePeople(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const person of list ?? []) {
      if (person?._id && !byId.has(person._id)) byId.set(person._id, person);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function AdminCallsScreen() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useCalls();
  const { data: dietitians } = useDietitians();
  const { data: admins } = useUsers({ role: 'admin' });
  const [tab, setTab] = useState('upcoming');
  const [kind, setKind] = useState('enquiry');
  const [dietitianId, setDietitianId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rescheduleCall, setRescheduleCall] = useState(null);

  const assignees = useMemo(() => mergePeople(dietitians, admins), [dietitians, admins]);
  const scoped = useMemo(() => {
    const byKind = (data ?? []).filter((call) => matchesKind(call, kind));
    return filterCalls(byKind, { personId: dietitianId, personKey: 'dietitian', from, to });
  }, [data, kind, dietitianId, from, to]);
  const groups = groupCallsByTab(scoped);
  const calls = groups[tab] ?? [];
  const filtersActive = Boolean(dietitianId || from || to);

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 min-[1050px]:px-9 min-[1050px]:py-9">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-wide text-brand-strong uppercase">Organisation calls</p>
        <h1 className="mt-1.5 text-3xl font-semibold text-forest">Calls</h1>
        <p className="mt-1.5 text-muted-foreground">
          Scheduled follow-ups for enquiries, plus client check-ins across your team.{' '}
          <Link to={`/${user.companySlug}/app/enquiries`} className="font-semibold text-forest hover:underline">
            Book a new enquiry call from the pipeline
          </Link>
          .
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Call type">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setKind(item.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              kind === item.id
                ? 'border-coral bg-coral text-white'
                : 'border-line bg-white text-forest hover:bg-cream'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <CallListFilters
        personLabel="Assigned to"
        allLabel="Everyone"
        personValue={dietitianId}
        onPersonChange={setDietitianId}
        people={assignees}
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onClear={() => {
          setDietitianId('');
          setFrom('');
          setTo('');
        }}
      />

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load calls"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : (
        <>
          <CallTabs value={tab} onChange={setTab} groups={groups} />

          <div className="mt-5 grid gap-3">
            {calls.length === 0 ? (
              <EmptyState
                icon={PhoneOff}
                title={filtersActive ? 'No calls match these filters' : EMPTY[tab].title}
                description={
                  filtersActive
                    ? 'Try another person or a wider date range.'
                    : EMPTY[tab].description
                }
              />
            ) : (
              calls.map((call) => (
                <DietitianCallCard
                  key={call._id}
                  call={call}
                  showAssignee
                  onReschedule={
                    call.status === 'scheduled' && new Date(call.scheduledAt).getTime() >= Date.now()
                      ? () => setRescheduleCall(call)
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </>
      )}

      <AdminCallRescheduleDialog
        open={Boolean(rescheduleCall)}
        onOpenChange={(open) => !open && setRescheduleCall(null)}
        call={rescheduleCall}
      />
    </div>
  );
}
