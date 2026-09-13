import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { followupInstant, formatTime } from "../../utils/date";
import { cn } from "../../utils/cn";
import type { Enquiry, Followup } from "../../types/domain";

interface FollowupCalendarProps {
  followups: Followup[];
  enquiryById: Map<string, Enquiry>;
  timezone: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Local calendar-day key for an instant, in the viewer's zone. en-CA gives YYYY-MM-DD. */
function dayKey(d: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function FollowupCalendar({ followups, enquiryById, timezone }: FollowupCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Followup[]>();
    for (const f of followups) {
      const key = dayKey(followupInstant(f), timezone);
      const list = map.get(key);
      if (list) list.push(f);
      else map.set(key, [f]);
    }
    // Chronological within each cell, so a day reads top-to-bottom as the order things happen.
    for (const list of map.values()) {
      list.sort((a, b) => followupInstant(a).getTime() - followupInstant(b).getTime());
    }
    return map;
  }, [followups, timezone]);

  const { cells, monthLabel } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    // Monday-first: JS getDay() is Sunday-0, so shift it.
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const out: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < lead; i++) {
      out.push({ date: new Date(year, month, i - lead + 1), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ date: new Date(year, month, d), inMonth: true });
    }
    // Pad to whole weeks so the grid never has a ragged last row.
    while (out.length % 7 !== 0) {
      out.push({ date: new Date(year, month, daysInMonth + (out.length % 7)), inMonth: false });
    }

    return {
      cells: out,
      monthLabel: first.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }, [cursor]);

  const todayKey = dayKey(new Date(), timezone);
  const nowMs = Date.now();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base text-offwhite">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-lg border border-border p-1.5 text-muted transition hover:border-borderStrong hover:text-offwhite"
            aria-label="Previous month"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-borderStrong hover:text-offwhite"
          >
            Today
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-lg border border-border p-1.5 text-muted transition hover:border-borderStrong hover:text-offwhite"
            aria-label="Next month"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl2 border border-border bg-border">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-surface px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-dim">
            {w}
          </div>
        ))}

        {cells.map(({ date, inMonth }, i) => {
          const key = dayKey(date, timezone);
          const items = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              key={`${key}-${i}`}
              className={cn(
                "min-h-[104px] bg-panel p-1.5 transition",
                !inMonth && "bg-surface/50",
                isToday && "bg-lime/[0.06]"
              )}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    isToday
                      ? "grid h-5 w-5 place-items-center rounded-full bg-lime text-white"
                      : inMonth
                        ? "text-muted"
                        : "text-dim/60"
                  )}
                >
                  {date.getDate()}
                </span>
                {items.length > 2 && <span className="text-[10px] text-dim">+{items.length - 2}</span>}
              </div>

              <div className="flex flex-col gap-1">
                {/* Two per cell keeps rows an even height; the counter above says how many more. */}
                {items.slice(0, 2).map((f) => {
                  const enq = enquiryById.get(f.enquiry_id);
                  const overdue = followupInstant(f).getTime() < nowMs && !isToday;
                  return (
                    <Link
                      key={f.id}
                      to={`/admin/enquiries/${f.enquiry_id}`}
                      title={`${enq?.company_name ?? "Unknown"} · ${formatTime(followupInstant(f).toISOString(), timezone)}`}
                      className={cn(
                        "block truncate rounded px-1.5 py-1 text-[10px] font-medium transition",
                        overdue
                          ? "bg-danger/12 text-dangerInk hover:bg-danger/20"
                          : isToday
                            ? "bg-warn/15 text-warnInk hover:bg-warn/25"
                            : "bg-lime/10 text-lime hover:bg-lime/20"
                      )}
                    >
                      {formatTime(followupInstant(f).toISOString(), timezone)} {enq?.company_name ?? "Unknown"}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-danger/40" /> Overdue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-warn/40" /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-lime/30" /> Upcoming
        </span>
      </div>
    </div>
  );
}
