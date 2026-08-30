import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { CallReminderField } from '@/components/portal/shared/CallReminderField';
import { SlotPicker, todayDateValue } from '@/components/portal/shared/SlotPicker';
import { ClientField } from './ClientField';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { useCreateCall, useUpdateCall } from '@/hooks/useCalls';
import { reminderValueToMinutes } from '@/lib/callScheduling';

const scheduleSchema = z.object({
  client: z.string().min(1, 'Choose a client'),
  scheduledAt: z.string().min(1, 'Choose an available time'),
  notes: z.string().optional(),
  reminderMinutesBefore: z.string(),
});
const rescheduleSchema = z.object({ scheduledAt: z.string().min(1, 'Choose an available time') });

function dateOnly(isoString) {
  return isoString ? isoString.slice(0, 10) : todayDateValue();
}

// mode: 'schedule' (new call, pick a client) | 'reschedule' (change scheduledAt on an existing one)
export function DietitianCallFormDialog({ open, onOpenChange, mode, call }) {
  const isReschedule = mode === 'reschedule';
  const { user } = useAuth();
  const clientsQuery = useClients();
  const createCall = useCreateCall();
  const updateCall = useUpdateCall();
  const isPending = isReschedule ? updateCall.isPending : createCall.isPending;
  const [date, setDate] = useState(todayDateValue());

  const form = useForm({
    resolver: zodResolver(isReschedule ? rescheduleSchema : scheduleSchema),
    defaultValues: { client: '', scheduledAt: '', notes: '', reminderMinutesBefore: '30' },
  });

  // The client's own saved timezone, for SlotPicker's "Client will see:" preview — whichever client
  // this call is/will be with, whether picked fresh (schedule mode) or already on the call being
  // rescheduled. call.client (from Call.js's join) only carries {_id, name}, not timezone, so this
  // looks the full record up in the already-fetched client list either way rather than trusting the
  // call object to carry it.
  const selectedClientId = isReschedule ? call?.client?._id : form.watch('client');
  const selectedClient = (clientsQuery.data ?? []).find((c) => c._id === selectedClientId);

  useEffect(() => {
    if (!open) return;
    const scheduledAt = isReschedule && call ? call.scheduledAt : '';
    form.reset({ client: '', scheduledAt, notes: '', reminderMinutesBefore: '30' });
    setDate(dateOnly(scheduledAt));
  }, [open, isReschedule, call, form]);

  function onSubmit(values) {
    if (isReschedule) {
      updateCall.mutate(
        { callId: call._id, scheduledAt: values.scheduledAt },
        {
          onSuccess: () => {
            toast.success('Call rescheduled.');
            onOpenChange(false);
          },
          onError: (error) =>
            toast.error(error.response?.data?.error || "We couldn't reschedule that — please try again."),
        }
      );
      return;
    }

    createCall.mutate(
      {
        client: values.client,
        scheduledAt: values.scheduledAt,
        notes: values.notes || undefined,
        reminderMinutesBefore: reminderValueToMinutes(values.reminderMinutesBefore),
      },
      {
        onSuccess: () => {
          toast.success('Call scheduled.');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.response?.data?.error || "We couldn't schedule that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isReschedule ? 'Reschedule call' : 'Schedule a call'}</DialogTitle>
          <DialogDescription>
            {isReschedule ? 'Pick a new available time for this check-in.' : 'Book a check-in with one of your clients.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            {!isReschedule && <ClientField control={form.control} clients={clientsQuery.data} />}
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date &amp; time</FormLabel>
                  <FormControl>
                    <SlotPicker
                      dietitianId={user._id}
                      excludeCallId={isReschedule ? call?._id : undefined}
                      date={date}
                      onDateChange={setDate}
                      value={field.value}
                      onChange={field.onChange}
                      otherPartyTimezone={selectedClient?.timezone}
                      otherPartyLabel="Client"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isReschedule && (
              <>
                <CallReminderField control={form.control} />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <Button type="submit" disabled={isPending} className="mt-1 w-full rounded-full bg-coral text-white hover:bg-coral/90">
              {isPending ? 'Saving…' : isReschedule ? 'Save new time' : 'Schedule call'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
