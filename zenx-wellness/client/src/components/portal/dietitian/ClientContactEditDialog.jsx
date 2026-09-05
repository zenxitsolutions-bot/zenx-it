import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useUpdateUser } from '@/hooks/useUsers';
import { toE164OrEmpty } from '@/lib/phone';
import { TimezoneSelect } from '@/components/shared/TimezoneSelect';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  // PhoneInput always produces E.164 (e.g. "+14155550123") or '' — same isValidPhoneNumber check
  // as the server (server/src/schemas/user.schema.js).
  phone: z.string().refine((v) => !v || isValidPhoneNumber(v), 'Enter a valid phone number'),
  timezone: z.string().optional(),
});

// Spec §2026-round2-fixes item 3: "Edit Client, both admin and dietitian portals." Spec item 8
// (timezone rollout) added timezone to the same allowlist — user.controller.js#updateUser
// restricts a dietitian caller to exactly {email, phone, timezone, ...} on a client actually
// assigned to them; this dialog only ever sends fields in that allowlist rather than relying on
// the server to silently drop anything else.
export function ClientContactEditDialog({ open, onOpenChange, client }) {
  const updateUser = useUpdateUser();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: client.email, phone: toE164OrEmpty(client.phone), timezone: client.timezone || 'UTC' },
  });

  useEffect(() => {
    if (open) form.reset({ email: client.email, phone: toE164OrEmpty(client.phone), timezone: client.timezone || 'UTC' });
  }, [open, client, form]);

  function onSubmit(values) {
    updateUser.mutate(
      { userId: client._id, email: values.email, phone: values.phone, timezone: values.timezone },
      {
        onSuccess: () => {
          toast.success('Contact info updated.');
          onOpenChange(false);
        },
        onError: (error) => {
          if (error.response?.status === 409) {
            form.setError('email', { message: 'That email is already registered to another account' });
            return;
          }
          toast.error("We couldn't save that — please try again.");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit contact info</DialogTitle>
          <DialogDescription>Updates {client.name}'s email, phone, and timezone. They can still log in right away.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
                  <FormControl>
                    <PhoneInput
                      value={field.value}
                      onChange={(value) => field.onChange(value || '')}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <TimezoneSelect id="client-timezone" value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={updateUser.isPending}
              className="mt-1 w-full rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {updateUser.isPending ? 'Saving…' : 'Save'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
