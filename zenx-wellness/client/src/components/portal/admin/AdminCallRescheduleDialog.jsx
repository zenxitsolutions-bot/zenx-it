import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';
import { useUpdateCall } from '@/hooks/useCalls';
import { toDatetimeLocalValue } from '@/lib/format';
import { timezoneOffsetLabel } from '@/lib/timezone';

const schema = z.object({
  scheduledAt: z.string().min(1, 'Choose a date and time'),
});

export function AdminCallRescheduleDialog({ open, onOpenChange, call }) {
  const updateCall = useUpdateCall();
  const { browserTimezone: clockZone } = useViewerTimezone();
  const person = call?.client ?? call?.enquiry;
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { scheduledAt: '' },
  });

  useEffect(() => {
    if (!open || !call) return;
    form.reset({ scheduledAt: toDatetimeLocalValue(call.scheduledAt) });
  }, [open, call, form]);

  function onSubmit(values) {
    updateCall.mutate(
      { callId: call._id, scheduledAt: new Date(values.scheduledAt).toISOString(), force: true },
      {
        onSuccess: () => {
          toast.success('Call rescheduled.');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.response?.data?.error || "We couldn't reschedule that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule {person?.name ?? 'this call'}</DialogTitle>
          <DialogDescription>
            Enquiry follow-ups are not bound to dietitian working hours, so pick any time that works.
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
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>Times are in {clockZone} ({timezoneOffsetLabel(clockZone)}).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={updateCall.isPending}
              className="rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {updateCall.isPending ? 'Saving…' : 'Save new time'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
