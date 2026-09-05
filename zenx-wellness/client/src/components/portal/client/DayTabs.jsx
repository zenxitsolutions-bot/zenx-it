import { WEEKDAYS } from '@/lib/clientPortal';
import { addCalendarDays, formatCalendarDate, toCalendarDate } from '@/lib/calendarDate';
import { cn } from '@/lib/utils';

// weekStart is the dietitian's exact civil start date (YYYY-MM-DD). Tabs are that day plus
// 0..6 calendar days — the storage key WEEKDAYS[index] is only the meal's positional slot, not
// a claim that index 0 is Monday.
export function DayTabs({ weekStart, selectedDay, onSelect }) {
  const start = toCalendarDate(weekStart);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Day of the week">
      {WEEKDAYS.map((day, index) => {
        const date = start ? addCalendarDays(start, index) : null;
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
            {date ? formatCalendarDate(date, { weekday: 'short' }) : day.slice(0, 3)}
            {date && (
              <>
                <br />
                <small className="font-normal">{formatCalendarDate(date, { day: 'numeric' })}</small>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
