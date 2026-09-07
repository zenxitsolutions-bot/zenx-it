import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';
import { useUpdateEnquiry } from '@/hooks/useEnquiries';
import { toDatetimeLocalValue } from '@/lib/format';
import { timezoneOffsetLabel } from '@/lib/timezone';

// Books a real call directly against the enquiry — no client account exists yet (spec
// §2026-round2-fixes item 1: that only happens on an explicit "Successfully Converted / Won").
const schema = z.object({
  assignedTo: z.string().min(1, 'Choose an admin'),
  scheduledAt: z.string().min(1, 'Choose a date and time'),
  note: z.string().optional(),
});

function defaultFollowUpAt() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

// enquiry: the card being moved to "Follow-up" (never null while open).
export function EnquiryFollowUpDialog({ open, onOpenChange, enquiry }) {
  const { user } = useAuth();
  const updateEnquiry = useUpdateEnquiry();
  const { browserTimezone: clockZone } = useViewerTimezone();
  const { data: admins } = useUsers({ role: 'admin' });

  const adminOptions = useMemo(() => {
    const list = [...(admins ?? [])].filter((a) => !a.accountStatus || a.accountStatus === 'active');
    if (user?._id && !list.some((a) => a._id === user._id)) {
      list.unshift({ _id: user._id, name: user.name });
    }
    return list;
  }, [admins, user]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { assignedTo: user?._id ?? '', scheduledAt: defaultFollowUpAt(), note: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ assignedTo: user?._id ?? '', scheduledAt: defaultFollowUpAt(), note: '' });
  }, [open, form, user?._id]);

  function onSubmit(values) {
    updateEnquiry.mutate(
      {
        enquiryId: enquiry._id,
        status: 'follow-up',
        assignedTo: values.assignedTo,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        note: values.note || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Follow-up call scheduled.');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.response?.data?.error || "We couldn't schedule that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a follow-up for {enquiry.name}</DialogTitle>
          <DialogDescription>
            Books a real call held against this enquiry — {enquiry.name} doesn't get a client account until
            they're marked Successfully Converted / Won.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose an admin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {adminOptions.map((admin) => (
                        <SelectItem key={admin._id} value={admin._id}>
                          {admin.name}
                          {admin._id === user?._id ? ' (you)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Defaults to you. You can assign any admin in this organisation.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={updateEnquiry.isPending}
              className="mt-1 w-full rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {updateEnquiry.isPending ? 'Saving…' : 'Schedule follow-up'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
