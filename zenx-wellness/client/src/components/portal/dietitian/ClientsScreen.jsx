import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useClients } from '@/hooks/useClients';

export function ClientsScreen() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const { data, isLoading, isError, refetch } = useClients();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const visible = (data ?? []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto max-w-4xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            {data ? `${data.length} ${data.length === 1 ? 'person' : 'people'}${isAdmin ? ' across the business' : ' in your care'}` : ''}
          </p>
          <h1 className="mt-1 text-3xl text-forest">{isAdmin ? 'All clients' : 'Your clients'}</h1>
          <p className="mt-1 text-muted-foreground">
            {isAdmin ? 'Every client on the platform, across every dietitian.' : "Stay close to the progress that matters."}
          </p>
        </div>
      </div>

      <Input placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 max-w-sm" />

      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load your clients"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Users}
          title={data?.length ? 'No clients match' : 'No clients yet'}
          description={
            data?.length
              ? 'Try a different search.'
              : isAdmin
                ? 'Clients will show up here once added, via Manage users or self-registration.'
                : 'Clients assigned to you will show up here.'
          }
        />
      ) : (
        <div className="grid gap-2">
          {visible.map((client) => (
            <button
              key={client._id}
              type="button"
              onClick={() => navigate(`/${user.companySlug}/app/clients/${client._id}`)}
              className="flex items-center gap-3 rounded-card bg-white p-4 text-left shadow-soft transition-shadow hover:shadow-md"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sage font-semibold text-forest">
                {client.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="block text-forest">{client.name}</strong>
                <span className="text-xs text-muted-foreground">{client.email}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
