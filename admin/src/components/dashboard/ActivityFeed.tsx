import {
  UserPlus,
  PhoneCall,
  CalendarClock,
  CheckCircle2,
  XCircle,
  KeyRound,
  Pencil,
  Activity as ActivityIcon,
} from "lucide-react";
import { formatRelative } from "../../utils/date";
import type { AuditLog, Profile } from "../../types/domain";
import { cn } from "../../utils/cn";

/* The feed is rendered from real audit-log rows — the same records the Audit Logs page shows —
   rather than a separate activity table. `action` is a free-form verb written by the server, so
   the mapping matches on substrings and falls through to a neutral icon instead of throwing away
   rows it doesn't recognise: an unmapped action should still appear, just without a bespoke icon. */
const RULES: { match: RegExp; icon: typeof UserPlus; tone: string }[] = [
  { match: /convert|won/i, icon: CheckCircle2, tone: "bg-ok/10 text-okInk" },
  { match: /lost|reject/i, icon: XCircle, tone: "bg-danger/10 text-dangerInk" },
  { match: /follow/i, icon: CalendarClock, tone: "bg-warn/10 text-warnInk" },
  { match: /contact|call|interaction/i, icon: PhoneCall, tone: "bg-lime/10 text-lime" },
  { match: /credential|password|provision/i, icon: KeyRound, tone: "bg-surface text-muted" },
  { match: /create|add|new|invite/i, icon: UserPlus, tone: "bg-lime/10 text-lime" },
  { match: /update|edit|change/i, icon: Pencil, tone: "bg-surface text-muted" },
];

function visualFor(action: string) {
  return RULES.find((r) => r.match.test(action)) ?? { icon: ActivityIcon, tone: "bg-surface text-muted" };
}

export function ActivityFeed({ logs, admins }: { logs: AuditLog[]; admins: Profile[] }) {
  if (logs.length === 0) {
    return <p className="py-10 text-center text-sm text-dim">No activity recorded yet.</p>;
  }

  const nameFor = (adminId: string) => {
    const a = admins.find((x) => x.id === adminId);
    return a ? `${a.first_name} ${a.last_name}` : null;
  };

  return (
    <ol className="flex flex-col">
      {logs.map((log, i) => {
        const { icon: Icon, tone } = visualFor(log.action);
        const who = nameFor(log.admin_id);
        return (
          <li key={log.id} className="flex gap-3 py-2.5">
            <div className="relative flex flex-col items-center">
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", tone)}>
                <Icon size={14} />
              </span>
              {/* Connector stops before the last row so the timeline doesn't dangle. */}
              {i < logs.length - 1 && <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-sm leading-snug text-offwhite">{log.description}</p>
              <p className="mt-0.5 text-xs text-dim">
                {who && <span className="text-muted">{who}</span>}
                {who && " · "}
                {formatRelative(log.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
