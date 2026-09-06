import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useWeeklyHours, useSaveWeeklyHours } from '@/hooks/useAvailability';
import { WEEKDAY_ORDER } from '@/lib/availability';

// Both fields blank = closed that day — no separate on/off switch, reuses only Input (a Checkbox/
// Switch primitive doesn't exist in this repo yet, see the shadcn/ui components already installed).
const dayRowSchema = z
  .object({ weekday: z.number(), startTime: z.string(), endTime: z.string() })
  .refine((row) => (row.startTime === '') === (row.endTime === ''), {
    message: 'Set both a start and end time, or leave both blank',
    path: ['endTime'],
  })
  .refine((row) => row.startTime === '' || row.startTime < row.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

const formSchema = z.object({ rows: z.array(dayRowSchema).length(WEEKDAY_ORDER.length) });

function emptyRows() {
  return WEEKDAY_ORDER.map(({ weekday }) => ({ weekday, startTime: '', endTime: '' }));
}

// Server TIME columns come back as 'HH:MM:SS' — <input type="time"> wants 'HH:MM'.
function toInputTime(value) {
  return value ? value.slice(0, 5) : '';
}

// dietitianId: omit for "my own hours" (dietitian self-service, e.g. AvailabilityScreen.jsx); pass
// it when an admin is editing a named dietitian's hours (DietitianProfileScreen.jsx) — this is the
// one component either context renders, writing to the same dietitian_weekly_hours model either
// way (spec §2026-round2-fixes item 2: "not a second copy").
export function WeeklyHoursForm({ dietitianId } = {}) {
  const { data, isLoading } = useWeeklyHours(dietitianId);
  const saveWeeklyHours = useSaveWeeklyHours(dietitianId);

  const form = useForm({ resolver: zodResolver(formSchema), defaultValues: { rows: emptyRows() } });

  useEffect(() => {
    if (!data) return;
    const byWeekday = new Map(data.map((day) => [day.weekday, day]));
    form.reset({
      rows: WEEKDAY_ORDER.map(({ weekday }) => {
        const existing = byWeekday.get(weekday);
        return {
          weekday,
          startTime: toInputTime(existing?.startTime),
          endTime: toInputTime(existing?.endTime),
        };
      }),
    });
  }, [data, form]);

  function onSubmit(values) {
    const days = values.rows
      .filter((row) => row.startTime && row.endTime)
      .map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime }));

    saveWeeklyHours.mutate(days, {
      onSuccess: () => toast.success('Weekly hours saved.'),
      onError: () => toast.error("We couldn't save your hours — please try again."),
    });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <p className="text-sm text-muted-foreground">
          Leave a day's times blank to mark it closed. Clients can only book within these hours.
        </p>
        <div className="grid gap-3">
          {WEEKDAY_ORDER.map(({ label }, index) => (
            <div key={label} className="grid grid-cols-[6rem_1fr_1fr] items-start gap-3">
              <span className="pt-1.5 text-sm font-medium text-forest">{label}</span>
              <FormField
                control={form.control}
                name={`rows.${index}.startTime`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">{label} start time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`rows.${index}.endTime`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">{label} end time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>
        <Button
          type="submit"
          disabled={saveWeeklyHours.isPending}
          className="w-fit rounded-full bg-coral text-white hover:bg-coral/90"
        >
          {saveWeeklyHours.isPending ? 'Saving…' : 'Save hours'}
        </Button>
      </form>
    </Form>
  );
}
