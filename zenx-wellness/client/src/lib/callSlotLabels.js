import { formatTime } from './format.js';
import { timezoneOffsetLabel } from './timezone.js';

// During the autumn DST transition two different UTC slots can both read "1:30 AM".
// Label only repeated clock times with their individual offsets, retaining the API's UTC value.
export function createCallSlotOptions(slots = [], timezone) {
  const options = slots.map((value) => ({ value, label: formatTime(value, timezone) }));
  const counts = new Map();
  for (const { label } of options) counts.set(label, (counts.get(label) ?? 0) + 1);
  return options.map(({ value, label }) => ({
    value,
    label: counts.get(label) > 1
      ? `${label} (${timezoneOffsetLabel(timezone, new Date(value))})`
      : label,
  }));
}
