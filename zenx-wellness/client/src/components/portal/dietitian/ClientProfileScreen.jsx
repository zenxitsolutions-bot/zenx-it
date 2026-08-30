import { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useClient } from '@/hooks/useClients';

// Same named-export adapter router.jsx uses for React.lazy — each tab is its own chunk, loaded
// only the first time it's opened, and (since Radix's TabsContent unmounts inactive tabs by
// default) its data queries don't even fire until then either. This is the "lazy-load the heavy
// sections" half of spec §6.
const lazyNamed = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));

const ClientOverviewTab = lazyNamed(() => import('./ClientOverviewTab'), 'ClientOverviewTab');
const ClientProgressTab = lazyNamed(() => import('./ClientProgressTab'), 'ClientProgressTab');
const ClientMealsTab = lazyNamed(() => import('./ClientMealsTab'), 'ClientMealsTab');
const ClientCallsTab = lazyNamed(() => import('./ClientCallsTab'), 'ClientCallsTab');
const ClientNotesTab = lazyNamed(() => import('./ClientNotesTab'), 'ClientNotesTab');
const ConsultationScheduleTab = lazyNamed(
  () => import('../shared/ConsultationScheduleTab'),
  'ConsultationScheduleTab'
);

const TAB_FALLBACK = <Skeleton className="h-64 w-full" />;

// The client profile "centrepiece" (spec §6): everything about one client — info/plan, full
// progress history, recent meal plans, call history with per-call notes, and general notes — in
// one page, tabbed so it stays usable instead of one enormous scroll.
export function ClientProfileScreen() {
  const { id, companySlug } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading, isError, refetch } = useClient(id);

  return (
    <div className="mx-auto max-w-5xl p-9">
      <button
        type="button"
        onClick={() => navigate(`/${companySlug}/app/clients`)}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to clients
      </button>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : isError || !client ? (
        <EmptyState
          title="Couldn't load this client"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-full bg-sage text-xl font-semibold text-forest">
              {client.name[0]}
            </div>
            <div>
              <h1 className="text-3xl text-forest">{client.name}</h1>
              <p className="text-muted-foreground">
                {client.email}
                {client.phone ? ` · ${client.phone}` : ''}
              </p>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="meals">Meal plans</TabsTrigger>
              <TabsTrigger value="calls">Calls</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <Suspense fallback={TAB_FALLBACK}>
                <ClientOverviewTab client={client} />
              </Suspense>
            </TabsContent>
            <TabsContent value="progress" className="mt-4">
              <Suspense fallback={TAB_FALLBACK}>
                <ClientProgressTab clientId={client._id} />
              </Suspense>
            </TabsContent>
            <TabsContent value="meals" className="mt-4">
              <Suspense fallback={TAB_FALLBACK}>
                <ClientMealsTab clientId={client._id} />
              </Suspense>
            </TabsContent>
            <TabsContent value="calls" className="mt-4">
              <Suspense fallback={TAB_FALLBACK}>
                <ClientCallsTab clientId={client._id} />
              </Suspense>
            </TabsContent>
            <TabsContent value="notes" className="mt-4">
              <Suspense fallback={TAB_FALLBACK}>
                <ClientNotesTab clientId={client._id} />
              </Suspense>
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
              <Suspense fallback={TAB_FALLBACK}>
                <ConsultationScheduleTab clientId={client._id} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
