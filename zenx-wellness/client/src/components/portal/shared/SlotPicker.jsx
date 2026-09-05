import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAvailableSlots } from '@/hooks/useCalls';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';
import { formatTime } from '@/lib/format';
import { timezoneOffsetLabel, formatInZone, todayDateValue } from '@/lib/timezone';

export { todayDateValue };

// Fully controlled: the parent dialog owns both `date` (which day's grid to show) and `value`
// (the selected slot's ISO string, wired to a react-hook-form field) — this mirrors how those
// dialogs already reset their form via a `useEffect` keyed on `open`, so resetting `date` there
// too keeps one reset mechanism instead of SlotPicker inventing its own.
//
// dietitianId: whose availability to query. excludeCallId: pass the call's own id when
// rescheduling so its current slot doesn't count against itself (server returns it as available).
// otherPartyTimezone/otherPartyLabel (both optional — spec item 6/18): when the caller knows who
// the OTHER person on this call is and that person's saved timezone, showing "{Label} sees: {time}"
// next to the selected slot makes a cross-timezone booking mistake obvious before saving, instead
// of only surfacing after the fact in a confirmation email.
export function SlotPicker({ dietitianId, excludeCallId, date, onDateChange, value, onChange, otherPartyTimezone, otherPartyLabel }) {
  const { timezone } = useViewerTimezone();
  const { data, isLoading, isError } = useAvailableSlots({ dietitianId, date, excludeCallId, timezone });

  return (
    <div className="grid gap-3">
      <Input type="date" min={todayDateValue(timezone)} value={date} onChange={(e) => onDateChange(e.target.value)} />

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
      ) : data.slots.length === 0 ? (
        <EmptyState title="No available times" description="Try a different date." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {data.slots.map((slot) => (
              <Button
                key={slot}
                type="button"
                size="sm"
                variant={slot === value ? 'default' : 'outline'}
                onClick={() => onChange(slot)}
              >
                {formatTime(slot, timezone)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Times shown in your timezone ({timezone}, {timezoneOffsetLabel(timezone)})
          </p>
          {value && otherPartyTimezone && otherPartyTimezone !== timezone && (
            <p className="rounded-lg bg-sage/30 px-2.5 py-1.5 text-xs text-forest">
              {otherPartyLabel ?? 'They'} will see: <strong>{formatInZone(value, otherPartyTimezone)}</strong> ({otherPartyTimezone})
            </p>
          )}
        </>
      )}
    </div>
  );
}
