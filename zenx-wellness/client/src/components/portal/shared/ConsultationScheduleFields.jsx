import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { TimezoneSelect } from '@/components/shared/TimezoneSelect';
import { WEEKDAY_ORDER } from '@/lib/availability';
import { FREQUENCY_PRESETS } from '@/lib/consultationSchedule';

// Pure form fields, no submit logic of its own — bound to a react-hook-form `control` the caller
// owns. Used both by the Client Settings tab (ConsultationScheduleTab.jsx) and by both
// client-creation dialogs, so the fields themselves are never duplicated even though only the
// settings tab is the literal "one shared component" the edit-time requirement is about.
//
// dietitianTimezone/onDietitianTimezoneChange (both optional): `preferredTime` has always been
// interpreted server-side as a wall-clock time in the assigned dietitian's OWN zone
// (services/consultationScheduleService.js), resolved fresh against whichever dietitian is
// currently assigned at generation time — not a value frozen on the schedule itself, so there's no
// separate "schedule timezone" column to edit. What IS editable is the dietitian's own timezone,
// right here: when a change handler is supplied, this renders a real dropdown that writes straight
// to that dietitian's users.timezone, so changing it here has the same effect as changing it from
// the dietitian's own Availability tab. Without a change handler (no dietitian resolved yet, e.g.
// EnquiryConvertedDialog's "no dietitian assigned" case), it falls back to a plain label.
export function ConsultationScheduleFields({ control, watch, warning, dietitianTimezone, onDietitianTimezoneChange }) {
  const frequencyPreset = watch('frequencyPreset');

  return (
    <div className="grid gap-4">
      <FormField
        control={control}
        name="frequencyPreset"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Frequency</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {FREQUENCY_PRESETS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {frequencyPreset === 'custom' && (
        <FormField
          control={control}
          name="customFrequencyDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Every how many days?</FormLabel>
              <FormControl>
                <Input type="number" min="1" max="90" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name="preferredWeekday"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Preferred day</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {WEEKDAY_ORDER.map(({ weekday, label }) => (
                  <SelectItem key={weekday} value={String(weekday)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="preferredTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Default call time</FormLabel>
            <FormControl>
              <Input type="time" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {dietitianTimezone && (
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-forest" htmlFor="cs-dietitian-timezone">
            Dietitian's timezone
          </label>
          {onDietitianTimezoneChange ? (
            <>
              <TimezoneSelect id="cs-dietitian-timezone" value={dietitianTimezone} onChange={onDietitianTimezoneChange} />
              <p className="text-xs text-muted-foreground">
                The call time above is set in this zone. Changing it updates the dietitian's own timezone everywhere, not just this schedule.
              </p>
            </>
          ) : (
            <p id="cs-dietitian-timezone" className="text-sm text-forest">
              {dietitianTimezone}
            </p>
          )}
        </div>
      )}

      <FormField
        control={control}
        name="startDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start date</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="active"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Paused</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {warning && (
        <p className="flex items-start gap-2 rounded-lg bg-peach/60 px-3 py-2 text-sm text-forest">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {warning}
        </p>
      )}
    </div>
  );
}
