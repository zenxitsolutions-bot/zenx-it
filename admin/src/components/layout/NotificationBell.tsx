import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Users2, CalendarClock, AlertCircle, PartyPopper, KeyRound } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { notificationsService } from "../../services/notifications";
import { formatRelative } from "../../utils/date";
import type { NotificationKind } from "../../types/domain";

const ICONS: Record<NotificationKind, typeof Bell> = {
  NEW_ENQUIRY: Users2,
  FOLLOWUP_DUE: CalendarClock,
  FOLLOWUP_OVERDUE: AlertCircle,
  CONVERTED: PartyPopper,
  APPLICATION_CREATED: KeyRound,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: notifications, refresh } = useLiveQuery(
    () => notificationsService.list(),
    [],
    { tables: ["notifications"] }
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-border p-2.5 text-muted transition hover:border-lime hover:text-lime"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[9px] font-bold text-ink">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 animate-fadeIn rounded-xl2 border border-border bg-panel shadow-panel">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-offwhite">Notifications</p>
            <button
              onClick={() => notificationsService.markAllRead().then(refresh)}
              className="flex items-center gap-1 text-xs text-muted hover:text-lime"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-dim">You're all caught up.</p>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.kind];
                return (
                  <button
                    key={n.id}
                    onClick={() => notificationsService.markRead(n.id).then(refresh)}
                    className={`flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition hover:bg-white/5 ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-lime">
                      <Icon size={14} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-xs font-semibold text-offwhite">{n.title}</span>
                      <span className="block text-xs text-muted">{n.body}</span>
                      <span className="mt-1 block text-[10px] text-dim">{formatRelative(n.created_at)}</span>
                    </span>
                    {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
