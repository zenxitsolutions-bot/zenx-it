import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateUser } from '@/hooks/useUsers';
import { ACCOUNT_STATUSES, ACCOUNT_STATUS_LABEL } from '@/lib/accountStatus';
import { toE164OrEmpty } from '@/lib/phone';

const schema = z.object({
  name: z.string().min(1, 'Enter a name'),
  email: z.string().email('Enter a valid email'),
  // PhoneInput always produces E.164 (e.g. "+14155550123") — same isValidPhoneNumber check as the
  // server (server/src/schemas/user.schema.js).
  phone: z.string().refine(isValidPhoneNumber, 'Enter a valid phone number'),
  address: z.string().min(1, 'Enter an address'),
  qualifications: z.string().optional(),
  accountStatus: z.enum(ACCOUNT_STATUSES),
});

function toFormValues(dietitian) {
  return {
    name: dietitian.name,
    email: dietitian.email,
    phone: toE164OrEmpty(dietitian.phone),
    address: dietitian.address ?? '',
    qualifications: dietitian.qualifications ?? '',
    accountStatus: dietitian.accountStatus ?? 'active',
  };
}

// Personal details, credentials, contact info, and account status — spec §2026-round2-fixes item
// 2's "full editing" list, minus working hours (its own tab — see DietitianWorkingHoursTab.jsx).
// 'suspended'/'inactive' never touch this dietitian's existing clients/calls/plans on their own —
// see the account_status comment in schema.sql for exactly what each state does and doesn't do.
export function DietitianDetailsForm({ dietitian }) {
  const updateUser = useUpdateUser();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(dietitian) });

  useEffect(() => {
    form.reset(toFormValues(dietitian));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dietitian._id]);

  function onSubmit(values) {
    updateUser.mutate(
      { userId: dietitian._id, ...values },
      {
        onSuccess: () => toast.success('Profile updated.'),
        onError: (error) => {
          // Email changes keep the account working — sessions/tokens key off the user's id, not
          // email (see server/src/utils/jwt.js) — the only real failure mode is a duplicate,
          // surfaced here on the field rather than a generic toast.
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
    <section className="rounded-card bg-white p-6 shadow-soft">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Street, city, postcode" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="qualifications"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credentials / qualifications</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="e.g. Registered Dietitian, MS in Clinical Nutrition" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accountStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACCOUNT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {ACCOUNT_STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Suspended blocks login immediately, for everyone already signed in too. Inactive doesn't affect
                  login. Neither ever cancels, hides, or reassigns any of this dietitian's existing clients or
                  appointments — those stay exactly as they are.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={updateUser.isPending}
            className="w-fit rounded-full bg-coral text-white hover:bg-coral/90"
          >
            {updateUser.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Form>
    </section>
  );
}
