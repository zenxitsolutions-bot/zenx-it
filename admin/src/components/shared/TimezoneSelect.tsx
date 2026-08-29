import { Select } from "../ui/Field";
import { TIMEZONES, browserTimezone } from "../../lib/timezone";

interface TimezoneSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// A real dropdown (the same native <select> every other field in this app already uses via
// Field.tsx) — was previously an <input list>+<datalist>, which several users reported as "not a
// dropdown" (no visible arrow, looks like a plain pre-filled text field). This is the one
// IANA-zone picker in this app — SettingsPage.tsx, FollowupScheduleFields.tsx both render this.
export function TimezoneSelect({ id, value, onChange, className }: TimezoneSelectProps) {
  const options = TIMEZONES.length > 0 ? TIMEZONES : [browserTimezone()];
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {options.map((tz) => (
        <option key={tz} value={tz}>
          {tz}
        </option>
      ))}
    </Select>
  );
}
