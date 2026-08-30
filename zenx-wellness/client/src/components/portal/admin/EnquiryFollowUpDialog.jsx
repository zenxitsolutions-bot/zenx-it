import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlotPicker, todayDateValue } from '@/components/portal/shared/SlotPicker';
import { useDietitians } from '@/hooks/useClients';
import { useUpdateEnquiry } from '@/hooks/useEnquiries';

// Books a real call directly against the enquiry — no client account exists yet (spec
// §2026-round2-fixes item 1: that only happens on an explicit "Successfully Converted / Won").
const schema = z.object({
  dietitian: z.string().min(1, 'Choose a dietitian'),
  scheduledAt: z.string().min(1, 'Choose an available time'),
  note: z.string().optional(),
});

// enquiry: the card being moved to "Follow-up" (never null while open).
export function EnquiryFollowUpDialog({ open, onOpenChange, enquiry }) {
  const updateEnquiry = useUpdateEnquiry();
  const { data: dietitians } = useDietitians();
  const [date, setDate] = useState(todayDateValue());

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { dietitian: '', scheduledAt: '', note: '' },
  });
  const dietitian = form.watch('dietitian');

  useEffect(() => {
    if (!open) return;
    form.reset({ dietitian: '', scheduledAt: '', note: '' });
    setDate(todayDateValue());
  }, [open, form]);

  function onSubmit(values) {
    updateEnquiry.mutate(
      {
        enquiryId: enquiry._id,
        status: 'follow-up',
        dietitian: values.dietitian,
        scheduledAt: values.scheduledAt,
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
              name="dietitian"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietitian</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a dietitian" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(dietitians ?? []).map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {dietitian && (
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date &amp; time</FormLabel>
                    <FormControl>
                      <SlotPicker
                        dietitianId={dietitian}
                        date={date}
                        onDateChange={setDate}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
