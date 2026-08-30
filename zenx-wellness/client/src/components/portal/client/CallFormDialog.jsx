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
import { useAuth } from '@/hooks/useAuth';
import { useCreateCall, useUpdateCall } from '@/hooks/useCalls';
import { useDietitians } from '@/hooks/useClients';
import { reminderValueToMinutes } from '@/lib/callScheduling';

const bookSchema = z.object({
  scheduledAt: z.string().min(1, 'Choose an available time'),
  notes: z.string().optional(),
  reminderMinutesBefore: z.string(),
});
const rescheduleSchema = z.object({ scheduledAt: z.string().min(1, 'Choose an available time') });

function dateOnly(isoString) {
  return isoString ? isoString.slice(0, 10) : todayDateValue();
}

// mode: 'book' (create a new call) | 'reschedule' (change scheduledAt on an existing one).
export function CallFormDialog({ open, onOpenChange, mode, call }) {
  const isReschedule = mode === 'reschedule';
  const { user } = useAuth();
  const createCall = useCreateCall();
  const updateCall = useUpdateCall();
  const isPending = isReschedule ? updateCall.isPending : createCall.isPending;
  const [date, setDate] = useState(todayDateValue());
  const dietitianId = isReschedule ? (call?.dietitian?._id ?? call?.dietitian) : user.assignedDietitian;
  const dietitiansQuery = useDietitians();
  const dietitian = (dietitiansQuery.data ?? []).find((d) => d._id === dietitianId);

  const form = useForm({
    resolver: zodResolver(isReschedule ? rescheduleSchema : bookSchema),
    defaultValues: { scheduledAt: '', notes: '', reminderMinutesBefore: '30' },
  });

  useEffect(() => {
    if (!open) return;
    const scheduledAt = isReschedule && call ? call.scheduledAt : '';
    form.reset({ scheduledAt, notes: '', reminderMinutesBefore: '30' });
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
        scheduledAt: values.scheduledAt,
        notes: values.notes || undefined,
        reminderMinutesBefore: reminderValueToMinutes(values.reminderMinutesBefore),
      },
      {
        onSuccess: () => {
          toast.success('Call booked — see you then!');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.response?.data?.error || "We couldn't book that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isReschedule ? 'Reschedule your call' : 'Book a call'}</DialogTitle>
          <DialogDescription>
            {isReschedule ? 'Pick a new available time.' : 'Choose an available time for your next check-in.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date &amp; time</FormLabel>
                  <FormControl>
                    <SlotPicker
                      // Rescheduling must check the availability of the dietitian this call is
                      // actually *with* — not the client's current assignedDietitian, which can
                      // drift from it after a reassignment (an existing call's own dietitian never
                      // changes when a client is later moved to someone else). Booking a brand-new
                      // call has no existing dietitian to defer to, so it correctly falls back to
                      // the client's current assignment (matching createCall's own server-side
                      // derivation in call.controller.js).
                      dietitianId={dietitianId}
                      excludeCallId={isReschedule ? call?._id : undefined}
                      date={date}
                      onDateChange={setDate}
                      value={field.value}
                      onChange={field.onChange}
                      otherPartyTimezone={dietitian?.timezone}
                      otherPartyLabel="Your dietitian"
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
                      <FormLabel>Anything you'd like to cover? (optional)</FormLabel>
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
              {isPending ? 'Saving…' : isReschedule ? 'Save new time' : 'Book call'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
