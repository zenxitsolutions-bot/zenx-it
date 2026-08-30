import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useReports } from '@/hooks/useReports';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';
import { DietitianReportCard } from './DietitianReportCard';

const FILTERS = ['All', 'Pending', 'Reviewed'];

export function DietitianReportsScreen() {
  const clientsQuery = useClients();
  const [clientId, setClientId] = useState('');
  const [filter, setFilter] = useState('All');

  const clients = clientsQuery.data ?? [];
  const selectedClient = clients.find((c) => c._id === clientId);

  // Never show every client's reports mixed together — default to the first client as soon as
  // the list loads, so there's always exactly one client selected.
  useEffect(() => {
    if (!clientId && clients.length > 0) setClientId(clients[0]._id);
  }, [clientId, clients]);

  const { data, isLoading, isError, refetch } = useReports(clientId || null);

  const visible = (data ?? []).filter((r) => filter === 'All' || r.status === filter.toLowerCase());

  return (
    <div className="mx-auto max-w-3xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">Keep every client feeling seen</p>
        <h1 className="mt-1 text-3xl text-forest">Report reviews</h1>
        <p className="mt-1 text-muted-foreground">Reports uploaded by your clients, newest first.</p>
      </div>

      {clientsQuery.isLoading ? (
        <Skeleton className="mb-6 h-16 w-full" />
      ) : clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Once you have a client assigned, their reports will show up here." />
      ) : (
        <>
          <label className="mb-2 block text-xs font-bold text-muted-foreground">
            Client
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-1.5 w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {selectedClient && (
            <p className="mb-4 text-sm text-muted-foreground">
              Showing reports for <strong className="text-forest">{selectedClient.name}</strong>
            </p>
          )}

          <div className="mb-4 flex gap-1.5">
            {FILTERS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setFilter(label)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  filter === label ? 'bg-forest text-white' : 'bg-sage/40 text-forest hover:bg-sage/60'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : isError ? (
            <EmptyState
              title="Couldn't load reports"
              description="Something went wrong on our end."
              action={
                <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
                  Try again
                </button>
              }
            />
          ) : visible.length === 0 ? (
            <EmptyState icon={FileText} title="Nothing here" description="Reports your clients upload will show up here." />
          ) : (
            <div className="grid gap-4">
              {visible.map((report) => (
                <DietitianReportCard key={report._id} report={report} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
