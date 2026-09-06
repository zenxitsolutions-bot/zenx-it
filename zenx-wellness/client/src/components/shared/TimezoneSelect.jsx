import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TIMEZONES, browserTimezone } from '@/lib/timezone';

// A real dropdown (shadcn/Radix Select, same component every other <select>-shaped field in the
// app uses) — was previously an <input list>+<datalist>, which several users reported as "not a
// dropdown" (no visible arrow, looks like a plain pre-filled text field, easy to miss that it's
// interactive at all). This is the one IANA-zone picker in the app — TimezoneField.jsx,
// DietitianWorkingHoursTab.jsx, PreferencesFields.jsx, ClientContactEditDialog.jsx,
// UserEditDialog.jsx all render this instead of each hand-rolling their own.
export function TimezoneSelect({ id, value, onChange, className }) {
  // TIMEZONES can be empty on a runtime without Intl.supportedValuesOf (old Safari/Node<18) — fall
  // back to at least offering the browser's own detected zone so the dropdown is never empty.
  const options = TIMEZONES.length > 0 ? TIMEZONES : [browserTimezone()];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={className ?? 'w-full'}>
        <SelectValue placeholder="Select a timezone" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((tz) => (
          <SelectItem key={tz} value={tz}>
            {tz}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function isKnownTimezone(value) {
  return TIMEZONES.length === 0 || TIMEZONES.includes(value);
}
