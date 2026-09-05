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
import { ConsultationScheduleRegenerateDialog } from './ConsultationScheduleRegenerateDialog';
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

  const [pendingPayload, setPendingPayload] = useState(null);
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
    const affectedCalls = upcomingCalls ?? [];
    const patternChanged = Boolean(schedule) && schedulePatternChanged(schedule, payload);

    // Real booked calls would be cancelled+rebooked by a regenerate — ask first (never silently
    // rewrite something the client is already expecting).
    if (patternChanged && affectedCalls.length > 0) {
      setPendingPayload(payload);
      return;
    }
    // Nothing but stale gaps (or nothing at all) is affected — there's no booking to lose, so
    // regenerate straight away. Previously this fell through to a plain config-only save
    // (regenerateFutureCalls: false) whenever there were 0 upcoming calls, which silently skipped
    // regeneration entirely: the new time was stored but never actually retried, and old gap rows
    // from the previous pattern were left showing in "Needs attention" forever (nothing in the
    // codebase ever deleted a gap row) even after the conflict they described no longer existed.
    if (patternChanged && gaps.length > 0) {
      submitSave(payload, true);
      return;
    }
    submitSave(payload, false);
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

      {pendingPayload && (
        <ConsultationScheduleRegenerateDialog
          open
          onOpenChange={(open) => !open && setPendingPayload(null)}
          affectedCalls={upcomingCalls ?? []}
          isPending={save.isPending}
          onConfirm={(regenerate) => submitSave(pendingPayload, regenerate)}
        />
      )}
    </div>
  );
}
