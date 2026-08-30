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
import { useProgramPlans } from '@/hooks/useProgramPlans';
import { useUpdateEnquiry } from '@/hooks/useEnquiries';
import { useSaveConsultationSchedule } from '@/hooks/useConsultationSchedule';
import { PLAN_DURATIONS } from '@/lib/planDurations';
import { defaultConsultationScheduleValues, toApiPayload } from '@/lib/consultationSchedule';
import { ConsultationScheduleFields } from '@/components/portal/shared/ConsultationScheduleFields';

// Only ever opened when the enquiry doesn't have a client account yet — see
// EnquiryPipelineScreen.jsx's requestStatusChange, which skips this dialog (fires the mutation
// immediately) once an account already exists from an earlier Follow-up.
const EMPTY = { planId: '', planDuration: '', password: '', setUpSchedule: false, ...defaultConsultationScheduleValues() };

const schema = z
  .object({
    planId: z.string().min(1, 'Choose a plan'),
    planDuration: z.string().min(1, 'Choose a duration'),
    password: z.string().min(8, 'At least 8 characters'),
    // Consultation schedule — same field names ConsultationScheduleFields.jsx expects. A
    // conversion never assigns a dietitian (the new client picks one after logging in), so saving
    // here always lands with no dietitian yet — that's fine, see consultationScheduleService.js;
    // the schedule just waits until one is assigned.
    setUpSchedule: z.boolean().optional(),
    frequencyPreset: z.enum(['7', '14', 'custom']).optional(),
    customFrequencyDays: z.string().optional(),
    preferredWeekday: z.string().optional(),
    preferredTime: z.string().optional(),
    startDate: z.string().optional(),
    active: z.enum(['true', 'false']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.setUpSchedule && data.frequencyPreset === 'custom' && !data.customFrequencyDays) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a number of days', path: ['customFrequencyDays'] });
    }
  });

// enquiry: the card being moved to "Converted" (never null while open).
export function EnquiryConvertedDialog({ open, onOpenChange, enquiry }) {
  const updateEnquiry = useUpdateEnquiry();
  const saveSchedule = useSaveConsultationSchedule();
  const { data: programPlans } = useProgramPlans({ activeOnly: true });

  const form = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const setUpSchedule = form.watch('setUpSchedule');

  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [open, form]);

  function onSubmit(values) {
    // Only planId/planDuration/password belong in the enquiry-conversion payload — the schedule
    // fields (used separately below, via toApiPayload(values)) are stripped out here.
    const { planId, planDuration, password, setUpSchedule: shouldSetUpSchedule } = values;
    const enquiryValues = { planId, planDuration, password };
    updateEnquiry.mutate(
      { enquiryId: enquiry._id, status: 'converted', ...enquiryValues },
      {
        onSuccess: (updatedEnquiry) => {
          toast.success(`${enquiry.name} is now a client.`);
          onOpenChange(false);
          if (shouldSetUpSchedule && updatedEnquiry.convertedUserId) {
            saveSchedule.mutate(
              { client: updatedEnquiry.convertedUserId, ...toApiPayload(values), regenerateFutureCalls: false },
              { onError: () => toast.error(`${enquiry.name} was converted, but the consultation schedule couldn't be saved — set it up from their profile's Settings tab.`) }
            );
          }
        },
        onError: (error) => toast.error(error.response?.data?.error || "We couldn't save that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Convert {enquiry.name} to a client</DialogTitle>
          <DialogDescription>
            Creates their account, prefilled from this enquiry. Any follow-up calls and this
            enquiry's history carry over, so their record isn't empty. They'll pick a dietitian
            after logging in.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                        <SelectValue placeholder="Choose a duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
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
                <p className="mb-3 text-xs text-muted-foreground">
                  No dietitian is assigned yet — this saves the schedule now; it'll start generating
                  calls once one is assigned.
                </p>
                <ConsultationScheduleFields control={form.control} watch={form.watch} warning={null} />
              </div>
            )}
            <Button
              type="submit"
              disabled={updateEnquiry.isPending}
              className="mt-1 w-full rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {updateEnquiry.isPending ? 'Saving…' : 'Convert to client'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
