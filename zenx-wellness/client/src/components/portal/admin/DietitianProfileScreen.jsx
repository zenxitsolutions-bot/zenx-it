import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useClient } from '@/hooks/useClients';
import { ACCOUNT_STATUS_LABEL, ACCOUNT_STATUS_BADGE_VARIANT } from '@/lib/accountStatus';
import { DietitianDetailsForm } from './DietitianDetailsForm';
import { DietitianWorkingHoursTab } from './DietitianWorkingHoursTab';

// Spec §2026-round2-fixes item 2: "Edit Dietitian page" — full personal/contact/credential
// editing plus working hours, which writes to the exact same availability model (and reuses the
// exact same WeeklyHoursForm component) the dietitian's own self-service screen and the booking
// engine already use — see DietitianWorkingHoursTab.jsx.
export function DietitianProfileScreen() {
  const { id, companySlug } = useParams();
  const navigate = useNavigate();
  const { data: dietitian, isLoading, isError, refetch } = useClient(id);

  return (
    <div className="mx-auto max-w-3xl p-9">
      <button
        type="button"
        onClick={() => navigate(`/${companySlug}/app/users`)}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to users
      </button>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : isError || !dietitian ? (
        <EmptyState
          title="Couldn't load this dietitian"
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
              {dietitian.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl text-forest">{dietitian.name}</h1>
                <Badge variant={ACCOUNT_STATUS_BADGE_VARIANT[dietitian.accountStatus ?? 'active']} className="capitalize">
                  {ACCOUNT_STATUS_LABEL[dietitian.accountStatus ?? 'active']}
                </Badge>
              </div>
              <p className="text-muted-foreground">{dietitian.email}</p>
            </div>
          </div>

          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="hours">Working hours</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <DietitianDetailsForm dietitian={dietitian} />
            </TabsContent>

            <TabsContent value="hours" className="mt-4">
              <DietitianWorkingHoursTab dietitian={dietitian} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
