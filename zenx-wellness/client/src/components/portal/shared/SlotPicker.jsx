import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAvailableSlots } from '@/hooks/useCalls';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';
import { createCallSlotOptions } from '@/lib/callSlotLabels';
import { timezoneOffsetLabel, formatInZone, todayDateValue, zonedTimeToUtcIso } from '@/lib/timezone';

export { todayDateValue };

// Fully controlled: the parent dialog owns both `date` (which day's grid to show) and `value`
// (the selected slot's ISO string, wired to a react-hook-form field) — this mirrors how those
// dialogs already reset their form via a `useEffect` keyed on `open`, so resetting `date` there
// too keeps one reset mechanism instead of SlotPicker inventing its own.
//
// dietitianId: whose availability to query. excludeCallId: pass the call's own id when
// rescheduling so its current slot doesn't count against itself (server returns it as available).
// The other participant's latest detected zone is only a preview: their device can change zones
// after we last saw it. Booking always sends the unchanged UTC instant selected from the API.
export function SlotPicker({ dietitianId, excludeCallId, date, onDateChange, value, onChange, otherPartyTimezone, otherPartyLabel }) {
  const { timezone } = useViewerTimezone();
  const { data, isLoading, isError } = useAvailableSlots({ dietitianId, date, excludeCallId, timezone });
  const slotOptions = createCallSlotOptions(data?.slots, timezone);
  // A future appointment can have a different GMT offset from today's (US daylight saving).
  // Before selecting a slot, use midday on the chosen date rather than the current date.
  const offsetDate = value
    ? new Date(value)
    : date
      ? new Date(zonedTimeToUtcIso(`${date}T12:00`, timezone))
      : new Date();

  function changeDate(nextDate) {
    if (nextDate !== date) onChange('');
    onDateChange(nextDate);
  }

  return (
    <div className="grid gap-3">
      <Input type="date" min={todayDateValue(timezone)} value={date} onChange={(e) => changeDate(e.target.value)} />
      <p className="text-xs text-muted-foreground">
        Your local time · {timezone} ({timezoneOffsetLabel(timezone, offsetDate)}). Converted automatically.
      </p>

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-16" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Couldn't load available times — please try again.</p>
      ) : !dietitianId ? (
        // useAvailableSlots' query is disabled (enabled: Boolean(dietitianId && date)) whenever
        // dietitianId is missing — `data` then stays undefined forever, `isLoading`/`isError` both
        // stay false, and `data.slots` below would throw. A caller can end up here (e.g. a call
        // whose dietitian somehow can't be resolved) — surface it instead of crashing the dialog
        // silently, which is exactly the "dead button" failure mode this was auditing for.
        <p className="text-sm text-destructive">Couldn't determine who this call is with — please try again.</p>
      ) : !data?.slots?.length ? (
        <EmptyState title="No available times" description="Try a different date." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {slotOptions.map(({ value: slot, label }) => (
              <Button
                key={slot}
                type="button"
                size="sm"
                variant={slot === value ? 'default' : 'outline'}
                onClick={() => onChange(slot)}
              >
                {label}
              </Button>
            ))}
          </div>
          {value && otherPartyTimezone && otherPartyTimezone !== timezone && (
            <p className="rounded-lg bg-sage/30 px-2.5 py-1.5 text-xs text-forest">
              {otherPartyLabel ?? 'Other participant'} time (last-known timezone): <strong>{formatInZone(value, otherPartyTimezone)}</strong> ({otherPartyTimezone}, {timezoneOffsetLabel(otherPartyTimezone, new Date(value))})
            </p>
          )}
        </>
      )}
    </div>
  );
}
