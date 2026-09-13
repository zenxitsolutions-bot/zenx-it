import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { planRangeDates, formatCalendarDate, toCalendarDate } from '@/lib/calendarDate';
import { cn } from '@/lib/utils';

const VISIBLE_DAYS = 7;

export function DayTabs({ weekStart, weekEnd, selectedDay, onSelect }) {
  const days = planRangeDates(toCalendarDate(weekStart), weekEnd);
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(days.length / VISIBLE_DAYS));
  const safePage = Math.min(page, pageCount - 1);
  const visibleDays = days.slice(safePage * VISIBLE_DAYS, safePage * VISIBLE_DAYS + VISIBLE_DAYS);
  const showArrows = days.length > VISIBLE_DAYS;

  useEffect(() => {
    const index = days.indexOf(selectedDay);
    if (index >= 0) setPage(Math.floor(index / VISIBLE_DAYS));
  }, [selectedDay, weekStart, weekEnd]);

  if (days.length === 0) return null;

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      {showArrows && (
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={safePage === 0}
          aria-label="Previous 7 days"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-forest hover:bg-cream disabled:cursor-default disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
      )}

      <div role="tablist" aria-label="Plan days" className="grid min-w-0 flex-1 grid-cols-7 gap-1.5">
        {visibleDays.map((ymd) => {
          const isActive = ymd === selectedDay;
          return (
            <button
              key={ymd}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(ymd)}
              className={cn(
                'min-w-0 rounded-xl border px-1 py-2 text-center',
                isActive
                  ? 'border-coral bg-coral text-white shadow-sm'
                  : 'border-line bg-white text-forest hover:bg-cream'
              )}
            >
              <span className="block truncate text-sm font-semibold leading-tight">
                {formatCalendarDate(ymd, { weekday: 'short' })}
              </span>
              <small className="block truncate font-normal leading-tight">
                {formatCalendarDate(ymd, { day: 'numeric' })}
              </small>
            </button>
          );
        })}
      </div>

      {showArrows && (
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          disabled={safePage >= pageCount - 1}
          aria-label="Next 7 days"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-forest hover:bg-cream disabled:cursor-default disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
