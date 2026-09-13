import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useClient } from '@/hooks/useClients';
import { useUpdateUser } from '@/hooks/useUsers';
import { useConsultationSchedule, useSaveConsultationSchedule, useGeneratedUpcomingCalls } from '@/hooks/useConsultationSchedule';
import { consultationScheduleFormSchema, toFormValues, toApiPayload, schedulePatternChanged } from '@/lib/consultationSchedule';
import { ConsultationScheduleFields } from './ConsultationScheduleFields';
import { ConsultationScheduleSeriesLists } from './ConsultationScheduleSeriesLists';

// The one shared component for editing a client's consultation schedule from either portal —
// Admin's and Dietitian's client-detail pages both render this same tab (ClientProfileScreen.jsx
// is already the one shared screen for both roles); role checks happen server-side
// (assertDietitianOwnsClient), not by branching this component per role.
export function ConsultationScheduleTab({ clientId }) {
  const { data: client, isLoading: clientLoading } = useClient(clientId);
  // useClient is just GET /users/:id under the hood — reused here to look up the assigned
  // dietitian's own timezone for the field's label (see ConsultationScheduleFields.jsx).
  const { data: dietitian } = useClient(client?.assignedDietitian);
  const { data: scheduleData, isLoading: scheduleLoading } = useConsultationSchedule(clientId);
  const schedule = scheduleData?.schedule ?? null;
  const gaps = scheduleData?.gaps ?? [];
  const { data: upcomingCalls } = useGeneratedUpcomingCalls(clientId, schedule?.id);
  const save = useSaveConsultationSchedule();
  const updateDietitian = useUpdateUser();

  function saveDietitianTimezone(timezone) {
    if (!dietitian) return;
    updateDietitian.mutate(
      { userId: dietitian._id, timezone },
      {
        onSuccess: () => toast.success("Dietitian's timezone updated."),
        onError: () => toast.error("We couldn't update that — please try again."),
      }
    );
  }

  const [warning, setWarning] = useState(null);

  const form = useForm({ resolver: zodResolver(consultationScheduleFormSchema), defaultValues: toFormValues(null) });

  useEffect(() => {
    if (schedule) form.reset(toFormValues(schedule));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule]);

  function submitSave(payload, regenerateFutureCalls) {
    save.mutate(
      { client: clientId, ...payload, regenerateFutureCalls },
      {
        onSuccess: (result) => {
          setPendingPayload(null);
          setWarning(result.warning);
          if (result.warning) toast.warning(result.warning);
          if (result.generated.length || result.cancelled.length) {
            toast.success(`Saved — ${result.cancelled.length} cancelled, ${result.generated.length} booked.`);
          } else if (!result.warning) {
            toast.success('Consultation schedule saved.');
          }
          if (result.gaps.length) {
            toast.warning(`${result.gaps.length} occurrence(s) couldn't be booked — see "Needs attention" below.`);
          }
        },
        onError: () => toast.error("Couldn't save the consultation schedule — please try again."),
      }
    );
  }

  function onSubmit(values) {
    const payload = toApiPayload(values);
    const patternChanged = Boolean(schedule) && schedulePatternChanged(schedule, payload);

    // Changing the recurrence pattern always cancels the future calls the old pattern generated
    // and rebooks them from the new one — the schedule is the source of truth, so leaving calls
    // behind on a pattern that no longer exists is what made the two disagree.
    //
    // This used to open a dialog asking "regenerate, or leave them as they are?". That choice is
    // gone by request: a changed schedule now always wins. Only calls this schedule generated and
    // that are still in the future are touched — a manually booked call, or one that has already
    // happened, is never affected (see cancelFutureGeneratedCalls in
    // server/src/services/consultationScheduleService.js).
    //
    // Note the side effect: each cancelled call sends its cancellation email and each new one its
    // booking email, so a pattern change is visible to the client immediately.
    submitSave(payload, patternChanged);
  }

  if (clientLoading || scheduleLoading) return <Skeleton className="h-64 w-full" />;

  if (!client?.assignedDietitian) {
    return (
      <p className="rounded-card bg-white p-6 text-sm text-muted-foreground shadow-soft">
        This client has no dietitian assigned yet. Assign one first — the consultation schedule's
        time slot is validated against the assigned dietitian's working hours.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-card bg-white p-6 shadow-soft">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid max-w-md gap-4">
            <ConsultationScheduleFields
              control={form.control}
              watch={form.watch}
              warning={warning}
              dietitianTimezone={dietitian?.timezone}
              onDietitianTimezoneChange={saveDietitianTimezone}
            />
            <Button type="submit" disabled={save.isPending} className="w-fit rounded-full bg-coral text-white hover:bg-coral/90">
              {save.isPending ? 'Saving…' : 'Save schedule'}
            </Button>
          </form>
        </Form>
      </div>

      {schedule && (
        <div className="rounded-card bg-white p-6 shadow-soft">
          <ConsultationScheduleSeriesLists upcomingCalls={upcomingCalls ?? []} gaps={gaps} />
        </div>
      )}

    </div>
  );
}
