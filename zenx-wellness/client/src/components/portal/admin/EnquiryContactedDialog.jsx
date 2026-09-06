import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateEnquiry } from '@/hooks/useEnquiries';

const schema = z.object({ note: z.string().min(1, 'Add a note about the conversation') });

// enquiry: the card being moved to "Contacted" (never null while open).
export function EnquiryContactedDialog({ open, onOpenChange, enquiry }) {
  const updateEnquiry = useUpdateEnquiry();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { note: '' } });

  useEffect(() => {
    if (open) form.reset({ note: '' });
  }, [open, form]);

  function onSubmit(values) {
    updateEnquiry.mutate(
      { enquiryId: enquiry._id, status: 'contacted', note: values.note },
      {
        onSuccess: () => {
          toast.success('Marked as contacted.');
          onOpenChange(false);
        },
        onError: () => toast.error("We couldn't save that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark {enquiry.name} as contacted</DialogTitle>
          <DialogDescription>Capture what was discussed — this is added to their history.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conversation notes</FormLabel>
                  <FormControl>
                    <Textarea rows={4} autoFocus placeholder="What did you discuss?" {...field} />
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
              {updateEnquiry.isPending ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
