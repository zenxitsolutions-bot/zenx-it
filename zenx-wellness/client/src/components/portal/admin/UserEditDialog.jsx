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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDietitians } from '@/hooks/useClients';
import { useProgramPlans } from '@/hooks/useProgramPlans';
import { useUpdateUser } from '@/hooks/useUsers';
import { PLAN_DURATIONS } from '@/lib/planDurations';
import { toE164OrEmpty } from '@/lib/phone';
import { TimezoneSelect } from '@/components/shared/TimezoneSelect';

// Spec §2026-round2-fixes item 3: editable email/phone here too (admin's generic edit dialog —
// dietitians get their own richer page, see DietitianProfileScreen.jsx). Email format only; the
// server is the source of truth for uniqueness (a duplicate can't be checked client-side without
// exposing the full user directory) — its 409 surfaces on the field via onError below.
const schema = z.object({
  role: z.enum(['client', 'dietitian', 'admin']),
  email: z.string().email('Enter a valid email'),
  // PhoneInput always produces E.164 (e.g. "+14155550123") or '' — same isValidPhoneNumber check
  // as the server (server/src/schemas/user.schema.js).
  phone: z.string().refine((v) => !v || isValidPhoneNumber(v), 'Enter a valid phone number'),
  timezone: z.string().optional(),
  assignedDietitian: z.string().optional(),
  programPlan: z.string().optional(),
  planDuration: z.string().optional(),
});

function toFormValues(user) {
  return {
    role: user.role,
    email: user.email,
    phone: toE164OrEmpty(user.phone),
    timezone: user.timezone || 'UTC',
    assignedDietitian: user.assignedDietitian ?? 'none',
    programPlan: user.programPlan?._id ?? user.programPlan ?? 'none',
    planDuration: user.planDuration ?? 'none',
  };
}

// user: the user row being edited (never null while open).
export function UserEditDialog({ open, onOpenChange, user }) {
  const updateUser = useUpdateUser();
  const { data: dietitians } = useDietitians();
  const activeDietitians = (dietitians ?? []).filter((d) => {
    if (d._id === user.assignedDietitian) return true;
    return !d.accountStatus || d.accountStatus === 'active';
  });
  // Unlike the create dialog, this fetches every plan (not just active ones) — otherwise a client
  // already on a plan that's since been deactivated would show a blank Select instead of their
  // actual current plan.
  const { data: programPlans } = useProgramPlans();

  const form = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(user) });
  const role = form.watch('role');

  useEffect(() => {
    if (open) form.reset(toFormValues(user));
  }, [open, user, form]);

  function onSubmit(values) {
    updateUser.mutate(
      {
        userId: user._id,
        role: values.role,
        email: values.email,
        phone: values.phone,
        timezone: values.timezone,
        assignedDietitian: values.role === 'client' && values.assignedDietitian !== 'none' ? values.assignedDietitian : null,
        programPlan: values.role === 'client' && values.programPlan !== 'none' ? values.programPlan : null,
        planDuration: values.role === 'client' && values.planDuration !== 'none' ? values.planDuration : null,
      },
      {
        onSuccess: () => {
          toast.success(`${user.name}'s account was updated.`);
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {user.name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="dietitian">Dietitian</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
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
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <TimezoneSelect id="user-edit-timezone" value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {role === 'client' && (
              <>
                <FormField
                  control={form.control}
                  name="assignedDietitian"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned dietitian</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {activeDietitians.map((d) => (
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
                <FormField
                  control={form.control}
                  name="programPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No plan</SelectItem>
                          {(programPlans ?? []).map((p) => (
                            <SelectItem key={p._id} value={p._id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="planDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan duration</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {PLAN_DURATIONS.map((duration) => (
                            <SelectItem key={duration} value={duration}>
                              {duration}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateUser.isPending}
                className="rounded-full bg-coral text-white hover:bg-coral/90"
              >
                {updateUser.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
