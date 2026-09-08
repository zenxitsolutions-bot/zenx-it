import { planWeekDays } from '@/lib/clientPortal';
import { addCalendarDays, formatCalendarDate, toCalendarDate } from '@/lib/calendarDate';
import { cn } from '@/lib/utils';

// Tabs follow the plan's own 7-day window: a Wednesday start renders Wed…Tue, not Mon–Sun.
// The tab key is that civil weekday so "today" and meal grouping use the same name.
export function DayTabs({ weekStart, selectedDay, onSelect }) {
  const start = toCalendarDate(weekStart);
  const days = planWeekDays(start);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Day of the week">
      {days.map((day, index) => {
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
              'shrink-0 rounded-lg border px-4 py-2 text-center text-sm font-semibold transition-all',
              isActive
                ? 'border-coral bg-coral text-white shadow-sm'
                : 'border-line bg-white text-forest hover:border-line hover:bg-cream'
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
