import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { planRangeDates, formatCalendarDate, toCalendarDate } from '@/lib/calendarDate';
import { cn } from '@/lib/utils';

const VISIBLE_DAYS = 7;
const GAP_PX = 6;

export function DayTabs({ weekStart, weekEnd, selectedDay, onSelect }) {
  const start = toCalendarDate(weekStart);
  const days = planRangeDates(start, weekEnd);
  const viewportRef = useRef(null);
  const selectedRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const showArrows = days.length > VISIBLE_DAYS;
  const tabWidth =
    viewportWidth > 0 ? (viewportWidth - GAP_PX * (VISIBLE_DAYS - 1)) / VISIBLE_DAYS : null;

  function updateArrows() {
    const el = viewportRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => {
      setViewportWidth(el.clientWidth);
      updateArrows();
    };
    measure();
    const observer = new ResizeObserver(() => {
      setViewportWidth(el.clientWidth);
      updateArrows();
    });
    observer.observe(el);
    el.addEventListener('scroll', updateArrows, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', updateArrows);
    };
  }, [days.length]);

  useEffect(() => {
    if (!selectedRef.current || !viewportRef.current || !tabWidth) return;
    const viewport = viewportRef.current;
    const tab = selectedRef.current;
    const tabLeft = tab.offsetLeft;
    const tabRight = tabLeft + tab.offsetWidth;
    if (tabLeft < viewport.scrollLeft || tabRight > viewport.scrollLeft + viewport.clientWidth) {
      viewport.scrollTo({ left: Math.max(0, tabLeft - GAP_PX), behavior: 'smooth' });
    }
  }, [selectedDay, tabWidth]);

  function slide(direction) {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      {showArrows && (
        <button
          type="button"
          onClick={() => slide(-1)}
          disabled={!canPrev}
          aria-label="Previous 7 days"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-forest hover:bg-cream disabled:cursor-default disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
      )}

      <div
        ref={viewportRef}
        role="tablist"
        aria-label="Plan days"
        className="min-w-0 flex-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max" style={{ gap: GAP_PX }}>
          {days.map((ymd) => {
            const isActive = ymd === selectedDay;
            return (
              <button
                key={ymd}
                ref={isActive ? selectedRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(ymd)}
                style={
                  tabWidth
                    ? { width: tabWidth, minWidth: tabWidth, maxWidth: tabWidth, flex: '0 0 auto' }
                    : { flex: '0 0 auto' }
                }
                className={cn(
                  'box-border rounded-xl border py-2.5 text-center text-sm font-semibold',
                  isActive
                    ? 'border-coral bg-coral text-white shadow-sm'
                    : 'border-line bg-white text-forest hover:bg-cream'
                )}
              >
                <span className="block leading-tight">{formatCalendarDate(ymd, { weekday: 'short' })}</span>
                <small className="block font-normal leading-tight">{formatCalendarDate(ymd, { day: 'numeric' })}</small>
              </button>
            );
          })}
        </div>
      </div>

      {showArrows && (
        <button
          type="button"
          onClick={() => slide(1)}
          disabled={!canNext}
          aria-label="Next 7 days"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-forest hover:bg-cream disabled:cursor-default disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
