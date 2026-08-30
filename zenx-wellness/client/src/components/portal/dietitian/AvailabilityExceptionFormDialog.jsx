import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateAvailabilityException } from '@/hooks/useAvailability';
import { EXCEPTION_KIND_OPTIONS } from '@/lib/availability';

// One start/end range picker covers a single-date block, a same-day time block (lunch), and a
// multi-day holiday alike — matching the unified backend shape (dietitian_availability_exceptions).
const exceptionSchema = z
  .object({
    kind: z.string(),
    startAt: z.string().min(1, 'Choose a start'),
    endAt: z.string().min(1, 'Choose an end'),
    note: z.string().optional(),
  })
  .refine((values) => new Date(values.endAt) > new Date(values.startAt), {
    message: 'End must be after start',
    path: ['endAt'],
  });

const defaultValues = { kind: 'closed', startAt: '', endAt: '', note: '' };

export function AvailabilityExceptionFormDialog({ open, onOpenChange }) {
  const createException = useCreateAvailabilityException();
  const form = useForm({ resolver: zodResolver(exceptionSchema), defaultValues });

  useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, form]);

  function onSubmit(values) {
    createException.mutate(
      {
        kind: values.kind,
        startAt: new Date(values.startAt).toISOString(),
        endAt: new Date(values.endAt).toISOString(),
        note: values.note || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Saved.');
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.response?.data?.error || "We couldn't save that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Block time or add extra hours</DialogTitle>
          <DialogDescription>Use "Blocked" for a day off, a break, or a holiday — "Extra hours" to open up a normally closed time.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXCEPTION_KIND_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Until</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
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
                    <Input placeholder="e.g. Vacation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={createException.isPending}
              className="mt-1 w-full rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {createException.isPending ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
