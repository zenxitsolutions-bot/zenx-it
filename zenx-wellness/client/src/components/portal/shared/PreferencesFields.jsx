import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TimezoneSelect } from '@/components/shared/TimezoneSelect';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';

const DATE_FORMATS = [
  { value: 'MMM d, yyyy', label: 'Sep 15, 2026' },
  { value: 'd MMM yyyy', label: '15 Sep 2026' },
  { value: 'yyyy-MM-dd', label: '2026-09-15' },
  { value: 'MM/dd/yyyy', label: '09/15/2026' },
  { value: 'dd/MM/yyyy', label: '15/09/2026' },
];

// Timezone + country + date/time format — spec item 8's four profile preference fields, in one
// controlled form fragment so both the dietitian/client/admin "My Account" dialog (PreferencesDialog.jsx)
// and any future admin-on-behalf-of-a-user screen render the exact same fields. Pure controlled
// inputs (value/onChange per field) — no fetching or save logic here, matching TimezoneSelect's own
// "primitive only" convention.
//
// Each label is a SIBLING of its control, associated only via htmlFor — never a <label> wrapping a
// Radix Select trigger directly. A native label's click-forwarding plus the trigger's own click
// handler both fire when the trigger sits inside the label, which opens and immediately re-closes
// the dropdown in the same tick (looks like "clicking does nothing"). Every other Select in this
// app already avoids this via the shadcn FormLabel/FormControl pattern (siblings inside FormItem,
// never nested) — this file just needs to follow the same rule by hand.
export function PreferencesFields({ timezone, onTimezoneChange, country, onCountryChange, dateFormat, onDateFormatChange, timeFormat, onTimeFormatChange, isDietitian }) {
  const { timezone: localTimezone } = useViewerTimezone();
  return (
    <div className="grid gap-4">
      <p className="rounded-lg bg-cream p-3 text-sm text-forest">
        Calls and messages automatically use your device time zone: <strong>{localTimezone}</strong>.
        Each person sees the same appointment in their own local time.
      </p>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-forest" htmlFor="pref-timezone">
          {isDietitian ? 'Working-hours time zone' : 'Home time zone (fallback)'}
        </label>
        <TimezoneSelect id="pref-timezone" value={timezone} onChange={onTimezoneChange} />
        <p className="text-xs text-muted-foreground">
          {isDietitian ? 'Weekly availability uses this saved zone, even when you travel.' : 'Used before a device time zone has been detected.'}
        </p>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-forest" htmlFor="pref-country">
          Country
        </label>
        <Input
          id="pref-country"
          value={country ?? ''}
          onChange={(e) => onCountryChange(e.target.value.toUpperCase().slice(0, 2))}
          placeholder="e.g. US"
          maxLength={2}
          className="max-w-24 uppercase"
        />
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-forest" htmlFor="pref-date-format">
          Date format
        </label>
        <Select value={dateFormat} onValueChange={onDateFormatChange}>
          <SelectTrigger id="pref-date-format" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_FORMATS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-forest" htmlFor="pref-time-format">
          Time format
        </label>
        <Select value={timeFormat} onValueChange={onTimeFormatChange}>
          <SelectTrigger id="pref-time-format" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
            <SelectItem value="24h">24-hour (14:30)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
