import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, MessageSquarePlus, CheckCircle2, RefreshCcw, CheckCheck, XCircle, CalendarClock, AlertTriangle } from "lucide-react";
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
import { SkeletonRows } from "../../components/ui/Skeleton";
import { AddInteractionModal } from "../../components/enquiries/AddInteractionModal";
import { TimezoneToggle, type TimezoneViewMode } from "../../components/shared/TimezoneToggle";
import { formatTime, followupInstant } from "../../utils/date";
import { browserTimezone } from "../../lib/timezone";
import type { Enquiry, Followup, Profile } from "../../types/domain";

export default function FollowupsPage() {
  const { data: followups, loading, refresh } = useLiveQuery(
    () => followupsService.list(),
    [],
    { tables: ["followups"] }
  );
  const { data: enquiries } = useLiveQuery(() => enquiriesService.list(), [], { tables: ["enquiries"] });
  const { data: admins } = useLiveQuery(() => adminUsersService.list(), []);
  const { data: interactions } = useLiveQuery(() => interactionsService.list(), [], { tables: ["interactions"] });
  const [commentTarget, setCommentTarget] = useState<Enquiry | null>(null);
  const [zoneMode, setZoneMode] = useState<TimezoneViewMode>("mine");
  const { profile } = useAuth();
  const viewerTimezone = (profile?.timezone && profile.timezone !== "UTC" ? profile.timezone : browserTimezone()) as string;

  const { changeStatus, modals } = useEnquiryWorkflow(refresh);

  if (loading || !followups || !enquiries) return <SkeletonRows rows={5} />;

  // Real chronological bucketing now that every followup carries scheduled_at_utc — replaces the
  // old wall-clock-string comparison (${scheduled_date}T${scheduled_time}) that produced
  // "Invalid Date" once scheduled_date started round-tripping as a full ISO string, and was never
  // cross-timezone-correct even before that.
  const now = Date.now();
  const open = followups.filter((f) => f.status === "SCHEDULED");
  const today = open.filter((f) => isSameCalendarDay(followupInstant(f), new Date(), viewerTimezone));
  const overdue = open.filter((f) => !today.includes(f) && followupInstant(f).getTime() < now);
  const upcoming = open.filter((f) => !today.includes(f) && !overdue.includes(f));

  const enquiryById = new Map(enquiries.map((e) => [e.id, e]));
  const lastCommentByEnquiry = new Map<string, string>();
  for (const i of interactions ?? []) {
    if (!lastCommentByEnquiry.has(i.enquiry_id)) lastCommentByEnquiry.set(i.enquiry_id, i.comment);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <p className="text-xs text-dim">Times below are shown per the toggle — switch to see how they'd read for the assigned admin.</p>
        <TimezoneToggle mode={zoneMode} onChange={setZoneMode} companyAvailable={false} />
      </div>

      {overdue.length > 0 && (
        <Section
          title="Overdue"
          tone="danger"
          items={overdue}
          enquiryById={enquiryById}
          admins={admins ?? []}
          lastCommentByEnquiry={lastCommentByEnquiry}
          onOpenComment={setCommentTarget}
          onRefresh={refresh}
          onChangeStatus={changeStatus}
          zoneMode={zoneMode}
          viewerTimezone={viewerTimezone}
        />
      )}
      <Section
        title="Today"
        tone="lime"
        items={today}
        enquiryById={enquiryById}
        admins={admins ?? []}
        lastCommentByEnquiry={lastCommentByEnquiry}
        onOpenComment={setCommentTarget}
        onRefresh={refresh}
        onChangeStatus={changeStatus}
        emptyLabel="No follow-ups today."
        zoneMode={zoneMode}
        viewerTimezone={viewerTimezone}
      />
      <Section
        title="Upcoming"
        tone="default"
        items={upcoming}
        enquiryById={enquiryById}
        admins={admins ?? []}
        lastCommentByEnquiry={lastCommentByEnquiry}
        onOpenComment={setCommentTarget}
        onRefresh={refresh}
        onChangeStatus={changeStatus}
        emptyLabel="No upcoming follow-ups."
        zoneMode={zoneMode}
        viewerTimezone={viewerTimezone}
      />

      <AddInteractionModal
        open={Boolean(commentTarget)}
        enquiry={commentTarget}
        onClose={() => setCommentTarget(null)}
        onSaved={() => {
          setCommentTarget(null);
          refresh();
        }}
      />
      {modals}
    </div>
  );
}

function isSameCalendarDay(a: Date, b: Date, timezone: string): boolean {
  const key = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(d);
  return key(a) === key(b);
}

interface SectionProps {
  title: string;
  tone: "danger" | "lime" | "default";
  items: Followup[];
  enquiryById: Map<string, Enquiry>;
  admins: Profile[];
  lastCommentByEnquiry: Map<string, string>;
  onOpenComment: (e: Enquiry) => void;
  onRefresh: () => void;
  onChangeStatus: (e: Enquiry, status: "CONVERTED" | "LOST") => void;
  emptyLabel?: string;
  zoneMode: TimezoneViewMode;
  viewerTimezone: string;
}

const TONE_TEXT = { danger: "text-danger", lime: "text-lime", default: "text-offwhite" };

function Section({
  title,
  tone,
  items,
  enquiryById,
  admins,
  lastCommentByEnquiry,
  onOpenComment,
  onRefresh,
  onChangeStatus,
  zoneMode,
  viewerTimezone,
}: SectionProps) {
  const { toast } = useToast();
  const adminById = new Map(admins.map((a) => [a.id, a]));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className={`font-display text-lg ${TONE_TEXT[tone]}`}>{title}</h3>
        <span className="rounded-full bg-ink px-2 py-0.5 text-xs text-dim">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={CalendarClock} title={`No ${title.toLowerCase()} follow-ups`} description="You're all clear here." />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((f) => {
            const enquiry = enquiryById.get(f.enquiry_id);
            if (!enquiry) return null;
            const admin = f.assigned_to ? adminById.get(f.assigned_to) : undefined;
            // "Their" timezone means the assigned admin's — falls back to the viewer's own if no
            // admin is assigned (nothing else to show).
            const effectiveTimezone = zoneMode === "theirs" && admin?.timezone ? admin.timezone : viewerTimezone;
            const unverifiedTimezone = f.timezone === "UTC" && (f.status === "SCHEDULED" || f.status === "RESCHEDULED");
            return (
              <Card key={f.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-[200px] flex-1">
                  <Link to={`/admin/enquiries/${enquiry.id}`} className="font-semibold text-offwhite hover:text-lime">
                    {enquiry.company_name}
                  </Link>
                  <p className="text-xs text-muted">{enquiry.contact_name} · {enquiry.phone}</p>
                  {lastCommentByEnquiry.has(enquiry.id) && (
                    <p className="mt-1 truncate text-xs text-dim">
                      "{lastCommentByEnquiry.get(enquiry.id)}"
                    </p>
                  )}
                  {unverifiedTimezone && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-warn">
                      <AlertTriangle size={11} /> Timezone auto-assigned during upgrade — please verify this time.
                    </p>
                  )}
                </div>
                <div className="text-sm">
                  <p className={tone === "danger" ? "text-danger" : "text-offwhite"}>
                    {formatTime(followupInstant(f).toISOString(), effectiveTimezone)}
                  </p>
                  <p className="text-xs text-dim">{admin ? `${admin.first_name} ${admin.last_name}` : "Unassigned"}</p>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const newDate = prompt("Reschedule to date (YYYY-MM-DD):", f.scheduled_date);
                      if (!newDate) return;
                      const newTime = prompt("Time (HH:MM):", f.scheduled_time) ?? f.scheduled_time;
                      await followupsService.reschedule(f.id, newDate, newTime, f.timezone);
                      toast("Follow-up rescheduled");
                      onRefresh();
                    }}
                  >
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
    </div>
  );
}
