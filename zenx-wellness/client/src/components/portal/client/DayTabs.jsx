import { WEEKDAYS } from '@/lib/clientPortal';
import { cn } from '@/lib/utils';

// weekStart is always a plain "YYYY-MM-DD" string (the dietitian's exact Week Start Date pick,
// unmodified — see PlanBuilderScreen.jsx's date input and planBuilder.js's comment on this same
// UTC-parsing convention). `new Date("YYYY-MM-DD")` parses as UTC midnight per the ISO 8601 spec,
// so adding exact 24h*index millisecond multiples always lands on the correct calendar day
// regardless of DST (UTC has none) — this was already correct. What was NOT correct: labeling
// position `index` with the FIXED weekday name WEEKDAYS[index] ("Monday" for index 0, always),
// instead of the real weekday of that computed date. WEEKDAYS is a set of 7 positional storage
// keys (a meal's `day` field, unrelated to real calendar weekdays — see ScheduleRow.jsx/
// clientPortal.js#groupMealsByDay) — index 0 is "the first day of whichever week was selected,"
// not "Monday." Reading the label off the real date (forcing timeZone: 'UTC' in the formatter, so
// a browser in a timezone behind UTC never reads the previous local calendar day off a
// UTC-midnight instant) fixes that without touching the storage keys at all.
export function DayTabs({ weekStart, selectedDay, onSelect }) {
  const start = weekStart ? new Date(weekStart) : null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Day of the week">
      {WEEKDAYS.map((day, index) => {
        const date = start ? new Date(start.getTime() + index * 24 * 60 * 60 * 1000) : null;
        const isActive = day === selectedDay;
        return (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(day)}
            className={cn(
              'shrink-0 rounded-xl px-3.5 py-2 text-center text-sm font-semibold transition-colors',
              isActive ? 'bg-forest text-white' : 'bg-cream text-forest hover:bg-sage/50'
            )}
          >
            {date ? date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }) : day.slice(0, 3)}
            {date && (
              <>
                <br />
                <small className="font-normal">{date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })}</small>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
