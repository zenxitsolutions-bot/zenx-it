import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  MessageSquarePlus,
  CheckCircle2,
  RefreshCcw,
  CheckCheck,
  XCircle,
  CalendarClock,
  AlertTriangle,
  List,
  CalendarDays,
} from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { useEnquiryWorkflow } from "../../hooks/useEnquiryWorkflow";
import { followupsService } from "../../services/followups";
import { enquiriesService } from "../../services/enquiries";
import { adminUsersService } from "../../services/adminUsers";
import { interactionsService } from "../../services/interactions";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { AddInteractionModal } from "../../components/enquiries/AddInteractionModal";
import { RescheduleFollowupModal } from "../../components/followups/RescheduleFollowupModal";
import { FollowupCalendar } from "../../components/followups/FollowupCalendar";
import { TimezoneToggle, type TimezoneViewMode } from "../../components/shared/TimezoneToggle";
import { formatDateShort, formatTime, followupInstant } from "../../utils/date";
import { browserTimezone } from "../../lib/timezone";
import { cn } from "../../utils/cn";
import type { Enquiry, Followup, Profile } from "../../types/domain";

type Bucket = "overdue" | "today" | "upcoming";
type TabId = Bucket | "all";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
];

/* Overdue red, today amber, upcoming brand — the spec's traffic-light mapping, expressed in the
   warm palette rather than raw red/orange/blue. */
const TONE: Record<Bucket, { chip: string; dot: string; time: string }> = {
  overdue: { chip: "bg-danger/10 text-dangerInk", dot: "bg-danger", time: "text-dangerInk" },
  today: { chip: "bg-warn/10 text-warnInk", dot: "bg-warn", time: "text-warnInk" },
  upcoming: { chip: "bg-lime/10 text-lime", dot: "bg-lime", time: "text-offwhite" },
};

function isSameCalendarDay(a: Date, b: Date, timezone: string): boolean {
  const key = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
  return key(a) === key(b);
}

export default function FollowupsPage() {
  const { data: followups, loading, refresh } = useLiveQuery(() => followupsService.list(), [], {
    tables: ["followups"],
  });
  const { data: enquiries } = useLiveQuery(() => enquiriesService.list(), [], { tables: ["enquiries"] });
  const { data: admins } = useLiveQuery(() => adminUsersService.list(), []);
  const { data: interactions } = useLiveQuery(() => interactionsService.list(), [], { tables: ["interactions"] });

  const [commentTarget, setCommentTarget] = useState<Enquiry | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Followup | null>(null);
  const [zoneMode, setZoneMode] = useState<TimezoneViewMode>("mine");
  const [tab, setTab] = useState<TabId>("all");
  const [view, setView] = useState<"list" | "calendar">("list");

  const { profile } = useAuth();
  const viewerTimezone = (profile?.timezone && profile.timezone !== "UTC" ? profile.timezone : browserTimezone()) as string;

  const { changeStatus, modals } = useEnquiryWorkflow(refresh);

  // Chronological bucketing off scheduled_at_utc — never a wall-clock string comparison, which was
  // never cross-timezone-correct.
  const buckets = useMemo(() => {
    const now = Date.now();
    const open = (followups ?? []).filter((f) => f.status === "SCHEDULED");
    const today = open.filter((f) => isSameCalendarDay(followupInstant(f), new Date(), viewerTimezone));
    const todayIds = new Set(today.map((f) => f.id));
    const overdue = open.filter((f) => !todayIds.has(f.id) && followupInstant(f).getTime() < now);
    const overdueIds = new Set(overdue.map((f) => f.id));
    const upcoming = open.filter((f) => !todayIds.has(f.id) && !overdueIds.has(f.id));

    const byTime = (a: Followup, b: Followup) => followupInstant(a).getTime() - followupInstant(b).getTime();
    return {
      overdue: [...overdue].sort(byTime),
      today: [...today].sort(byTime),
      upcoming: [...upcoming].sort(byTime),
      open,
    };
  }, [followups, viewerTimezone]);

  const enquiryById = useMemo(() => new Map((enquiries ?? []).map((e) => [e.id, e])), [enquiries]);
  const adminById = useMemo(() => new Map((admins ?? []).map((a) => [a.id, a])), [admins]);

  const lastCommentByEnquiry = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of interactions ?? []) if (!map.has(i.enquiry_id)) map.set(i.enquiry_id, i.comment);
    return map;
  }, [interactions]);

  if (loading || !followups || !enquiries) return <SkeletonRows rows={5} />;

  const counts = {
    all: buckets.open.length,
    overdue: buckets.overdue.length,
    today: buckets.today.length,
    upcoming: buckets.upcoming.length,
  };

  const allSections: { id: Bucket; title: string; items: Followup[] }[] = [
    { id: "overdue", title: "Overdue", items: buckets.overdue },
    { id: "today", title: "Today", items: buckets.today },
    { id: "upcoming", title: "Upcoming", items: buckets.upcoming },
  ];
  const sections = allSections.filter((s) => tab === "all" || s.id === tab);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="Scheduled follow-ups across every open enquiry, bucketed by when they're due."
        actions={
          <div className="flex items-center gap-2">
            <TimezoneToggle mode={zoneMode} onChange={setZoneMode} companyAvailable={false} />
            <div className="flex gap-1 rounded-lg bg-surface p-1">
              {(
                [
                  { id: "list", label: "List", icon: List },
                  { id: "calendar", label: "Calendar", icon: CalendarDays },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                    view === v.id ? "bg-panel text-offwhite shadow-sm" : "text-muted hover:text-offwhite"
                  )}
                >
                  <v.icon size={13} /> {v.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {view === "calendar" ? (
        <Card className="p-5">
          <FollowupCalendar followups={buckets.open} enquiryById={enquiryById} timezone={viewerTimezone} />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition",
                  tab === t.id ? "text-offwhite" : "text-muted hover:text-offwhite"
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-pill px-1.5 py-0.5 text-[10px] font-bold",
                    t.id !== "all" && counts[t.id] > 0 ? TONE[t.id as Bucket].chip : "bg-surface text-dim"
                  )}
                >
                  {counts[t.id]}
                </span>
                {/* Underline rather than a filled pill: tabs sitting on the page (not in a card)
                    read better as a rule than as buttons. */}
                {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-lime" />}
              </button>
            ))}
          </div>

          {sections.every((s) => s.items.length === 0) ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing due here"
              description="Follow-ups you schedule from an enquiry will appear in these buckets."
            />
          ) : (
            sections.map((s) => (
              <Section
                key={s.id}
                bucket={s.id}
                title={s.title}
                items={s.items}
                enquiryById={enquiryById}
                adminById={adminById}
                lastCommentByEnquiry={lastCommentByEnquiry}
                onOpenComment={setCommentTarget}
                onReschedule={setRescheduleTarget}
                onRefresh={refresh}
                onChangeStatus={changeStatus}
                zoneMode={zoneMode}
                viewerTimezone={viewerTimezone}
                hideWhenEmpty={tab === "all"}
              />
            ))
          )}
        </>
      )}

      <AddInteractionModal
        open={Boolean(commentTarget)}
        enquiry={commentTarget}
        onClose={() => setCommentTarget(null)}
        onSaved={() => {
          setCommentTarget(null);
          refresh();
        }}
      />

      <RescheduleFollowupModal
        open={Boolean(rescheduleTarget)}
        followup={rescheduleTarget}
        assignee={rescheduleTarget?.assigned_to ? adminById.get(rescheduleTarget.assigned_to) : undefined}
        onClose={() => setRescheduleTarget(null)}
        onSaved={() => {
          setRescheduleTarget(null);
          refresh();
        }}
      />

      {modals}
    </div>
  );
}

interface SectionProps {
  bucket: Bucket;
  title: string;
  items: Followup[];
  enquiryById: Map<string, Enquiry>;
  adminById: Map<string, Profile>;
  lastCommentByEnquiry: Map<string, string>;
  onOpenComment: (e: Enquiry) => void;
  onReschedule: (f: Followup) => void;
  onRefresh: () => void;
  onChangeStatus: (e: Enquiry, status: "CONVERTED" | "LOST") => void;
  zoneMode: TimezoneViewMode;
  viewerTimezone: string;
  hideWhenEmpty: boolean;
}

function Section({
  bucket,
  title,
  items,
  enquiryById,
  adminById,
  lastCommentByEnquiry,
  onOpenComment,
  onReschedule,
  onRefresh,
  onChangeStatus,
  zoneMode,
  viewerTimezone,
  hideWhenEmpty,
}: SectionProps) {
  const { toast } = useToast();
  const tone = TONE[bucket];

  // On the "All" tab an empty bucket is just noise between two populated ones; on its own tab the
  // empty state is the answer to the question the user asked.
  if (items.length === 0 && hideWhenEmpty) return null;

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", tone.dot)} aria-hidden="true" />
        <h3 className="font-display text-base text-offwhite">{title}</h3>
        <span className="rounded-pill bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={CalendarClock} title={`No ${title.toLowerCase()} follow-ups`} description="You're all clear here." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((f) => {
            const enquiry = enquiryById.get(f.enquiry_id);
            if (!enquiry) return null;
            const admin = f.assigned_to ? adminById.get(f.assigned_to) : undefined;
            const effectiveTimezone = zoneMode === "theirs" && admin?.timezone ? admin.timezone : viewerTimezone;
            const unverifiedTimezone = f.timezone === "UTC" && (f.status === "SCHEDULED" || f.status === "RESCHEDULED");
            const instant = followupInstant(f).toISOString();

            return (
              <Card key={f.id} interactive className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[200px] flex-1">
                  <Link to={`/admin/enquiries/${enquiry.id}`} className="font-semibold text-offwhite hover:text-lime">
                    {enquiry.company_name}
                  </Link>
                  <p className="text-xs text-muted">
                    {enquiry.contact_name} · {enquiry.phone}
                  </p>
                  {lastCommentByEnquiry.has(enquiry.id) && (
                    <p className="mt-1 truncate text-xs italic text-dim">"{lastCommentByEnquiry.get(enquiry.id)}"</p>
                  )}
                  {unverifiedTimezone && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-warnInk">
                      <AlertTriangle size={11} /> Timezone auto-assigned during upgrade — please verify this time.
                    </p>
                  )}
                </div>

                <div className="text-sm">
                  <p className={cn("font-semibold", tone.time)}>
                    {formatDateShort(instant, effectiveTimezone)} · {formatTime(instant, effectiveTimezone)}
                  </p>
                  <p className="text-xs text-dim">
                    {admin ? `${admin.first_name} ${admin.last_name}` : "Unassigned"} · {f.contact_method}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a href={`tel:${enquiry.phone}`}>
                    <Button size="sm" variant="secondary">
                      <Phone size={13} /> Call
                    </Button>
                  </a>
                  <Button size="sm" variant="secondary" onClick={() => onOpenComment(enquiry)}>
                    <MessageSquarePlus size={13} /> Comment
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await followupsService.complete(f.id);
                      toast("Follow-up completed");
                      onRefresh();
                    }}
                  >
                    <CheckCheck size={13} /> Complete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onReschedule(f)}>
                    <RefreshCcw size={13} /> Reschedule
                  </Button>
                  <Button size="sm" onClick={() => onChangeStatus(enquiry, "CONVERTED")}>
                    <CheckCircle2 size={13} /> Converted
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => onChangeStatus(enquiry, "LOST")}>
                    <XCircle size={13} /> Lost
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
