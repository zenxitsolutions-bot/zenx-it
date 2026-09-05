import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDietitians } from '@/hooks/useClients';
import { useProgramPlans } from '@/hooks/useProgramPlans';
import { useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { generateTempPassword } from '@/lib/generateTempPassword';
import { useSaveConsultationSchedule } from '@/hooks/useConsultationSchedule';
import { PLAN_DURATIONS } from '@/lib/planDurations';
import { defaultConsultationScheduleValues, toApiPayload } from '@/lib/consultationSchedule';
import { ConsultationScheduleFields } from '@/components/portal/shared/ConsultationScheduleFields';

// Phone/address are only required for a dietitian (spec §2026-round2-fixes item 1's explicit "Add
// and require: Email, Phone Number, Address") — enforced below via superRefine, mirroring the
// server's own createUserSchema so a client never gets a 400 the form itself could have caught.
const schema = z
  .object({
    name: z.string().min(1, 'Enter a name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    role: z.enum(['client', 'dietitian', 'admin']),
    phone: z.string().optional(),
    address: z.string().optional(),
    qualifications: z.string().optional(),
    assignedDietitian: z.string().optional(),
    programPlan: z.string().optional(),
    planDuration: z.string().optional(),
    // Consultation schedule (client role only) — same field names ConsultationScheduleFields.jsx
    // expects, so it can bind directly to this same form; only actually required when the
    // "Set up a consultation schedule now" checkbox is on (see the superRefine below). Saving
    // works with or without a dietitian assigned — see consultationScheduleService.js.
    setUpSchedule: z.boolean().optional(),
    frequencyPreset: z.enum(['7', '14', 'custom']).optional(),
    customFrequencyDays: z.string().optional(),
    preferredWeekday: z.string().optional(),
    preferredTime: z.string().optional(),
    startDate: z.string().optional(),
    active: z.enum(['true', 'false']).optional(),
  })
  .superRefine((data, ctx) => {
    // Format is checked regardless of role — a client/admin's phone, if they bother typing one,
    // should be rejected here too rather than only on the server's own round-trip. The
    // PhoneInput field always produces E.164 (e.g. "+14155550123") or '', so this is the same
    // isValidPhoneNumber check the server runs (server/src/schemas/user.schema.js).
    if (data.phone?.trim() && !isValidPhoneNumber(data.phone.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid phone number', path: ['phone'] });
    }
    if (data.role === 'client' && data.setUpSchedule && data.frequencyPreset === 'custom' && !data.customFrequencyDays) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a number of days', path: ['customFrequencyDays'] });
    }
    if (data.role !== 'dietitian') return;
    if (!data.phone?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone number is required for a dietitian', path: ['phone'] });
    }
    if (!data.address?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Address is required for a dietitian', path: ['address'] });
    }
  });

const EMPTY = {
  name: '',
  email: '',
  password: '',
  role: 'client',
  phone: '',
  address: '',
  qualifications: '',
  assignedDietitian: 'none',
  programPlan: 'none',
  planDuration: 'none',
  setUpSchedule: false,
  ...defaultConsultationScheduleValues(),
};

// Admin-only: create a new client, dietitian, or admin account directly (no self-registration needed).
export function UserFormDialog({ open, onOpenChange }) {
  const createUser = useCreateUser();
  const saveSchedule = useSaveConsultationSchedule();
  const updateDietitian = useUpdateUser();
  const { data: dietitians } = useDietitians();
  const { data: programPlans } = useProgramPlans({ activeOnly: true });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const role = form.watch('role');
  const setUpSchedule = form.watch('setUpSchedule');
  const assignedDietitianId = form.watch('assignedDietitian');
  const selectedDietitian = (dietitians ?? []).find((d) => d._id === assignedDietitianId);

  // Selecting a dietitian in "Assign a dietitian" already picks up their real, existing account —
  // unlike the client being created here, they're not a new row, so their timezone can be updated
  // right away rather than waiting for this form to submit.
  function saveDietitianTimezone(timezone) {
    if (!selectedDietitian) return;
    updateDietitian.mutate(
      { userId: selectedDietitian._id, timezone },
      {
        onSuccess: () => toast.success("Dietitian's timezone updated."),
        onError: () => toast.error("We couldn't update that — please try again."),
      }
    );
  }

  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [open, form]);

  function onSubmit(values) {
    const payload = {
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
      phone: values.phone || undefined,
      address: values.address || undefined,
      qualifications: values.role === 'dietitian' && values.qualifications ? values.qualifications : undefined,
      assignedDietitian: values.role === 'client' && values.assignedDietitian !== 'none' ? values.assignedDietitian : null,
      programPlan: values.role === 'client' && values.programPlan !== 'none' ? values.programPlan : null,
      planDuration: values.role === 'client' && values.planDuration !== 'none' ? values.planDuration : null,
    };

    createUser.mutate(payload, {
      onSuccess: (user) => {
        toast.success(`${values.name} was added as a ${values.role}.`);
        onOpenChange(false);
        // A follow-up save, not part of the same request — the account already exists regardless
        // of whether this succeeds (see consultationScheduleService.js's own non-blocking
        // principle applied here too).
        if (values.role === 'client' && values.setUpSchedule) {
          saveSchedule.mutate(
            { client: user._id, ...toApiPayload(values), regenerateFutureCalls: false },
            { onError: () => toast.error(`${values.name} was added, but the consultation schedule couldn't be saved — set it up from their profile's Settings tab.`) }
          );
        }
      },
      onError: (error) => {
        const message = error.response?.status === 409 ? 'That email is already registered.' : "We couldn't add that user — please try again.";
        toast.error(message);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
          <DialogDescription>Create a client, dietitian, or admin account directly.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Their full name" {...field} />
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
                    <Input type="email" placeholder="them@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary password</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input type="text" autoComplete="new-password" {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={() => field.onChange(generateTempPassword())}>
                      Generate
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number{role === 'dietitian' && ' *'}</FormLabel>
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
                  <FormLabel>Address{role === 'dietitian' && ' *'}</FormLabel>
                  <FormControl>
                    <Input placeholder="Street, city, postcode" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {role === 'dietitian' && (
              <FormField
                control={form.control}
                name="qualifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credentials / qualifications (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="e.g. Registered Dietitian, MS in Clinical Nutrition" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {role === 'client' && (
              <>
                <FormField
                  control={form.control}
                  name="assignedDietitian"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign a dietitian (optional)</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
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
                <FormField
                  control={form.control}
                  name="programPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan (optional)</FormLabel>
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
                      <FormLabel>Plan duration (optional)</FormLabel>
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
                <FormField
                  control={form.control}
                  name="setUpSchedule"
                  render={({ field }) => (
                    <FormItem>
                      <label className="flex items-center gap-2 text-sm font-medium text-forest">
                        <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="size-4" />
                        Set up a consultation schedule now
                      </label>
                    </FormItem>
                  )}
                />
                {setUpSchedule && (
                  <div className="rounded-lg border border-line p-4">
                    <ConsultationScheduleFields
                      control={form.control}
                      watch={form.watch}
                      warning={null}
                      dietitianTimezone={selectedDietitian?.timezone}
                      onDietitianTimezoneChange={saveDietitianTimezone}
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={createUser.isPending}
                className="rounded-full bg-coral text-white hover:bg-coral/90"
              >
                {createUser.isPending ? 'Adding…' : 'Add user'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
