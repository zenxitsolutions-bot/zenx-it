import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Plus,
  CheckCircle2,
  CalendarClock,
  XCircle,
  ArrowRightCircle,
  Building2,
} from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { useEnquiryWorkflow } from "../../hooks/useEnquiryWorkflow";
import { enquiriesService } from "../../services/enquiries";
import { interactionsService } from "../../services/interactions";
import { followupsService } from "../../services/followups";
import { adminUsersService } from "../../services/adminUsers";
import { companiesService } from "../../services/companies";
import { useToast } from "../../context/ToastContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { StatusBadge, PriorityBadge } from "../../components/ui/Badges";
import { PipelineStepper } from "../../components/enquiries/PipelineStepper";
import { ConversationTimeline } from "../../components/enquiries/ConversationTimeline";
import { AddInteractionModal } from "../../components/enquiries/AddInteractionModal";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { TimezoneToggle, type TimezoneViewMode } from "../../components/shared/TimezoneToggle";
import { LEAD_PRIORITIES, type LeadPriority } from "../../types/domain";
import { formatDate, formatDateTime, followupInstant } from "../../utils/date";
import { browserTimezone } from "../../lib/timezone";
import { useAuth } from "../../context/AuthContext";

export default function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [zoneMode, setZoneMode] = useState<TimezoneViewMode>("mine");
  const viewerTimezone = (profile?.timezone && profile.timezone !== "UTC" ? profile.timezone : browserTimezone()) as string;

  const { data: enquiry, loading, refresh } = useLiveQuery(
    async () => (id ? enquiriesService.get(id) : null),
    [id],
    { tables: ["enquiries"] }
  );
  const { data: interactions, refresh: refreshInteractions } = useLiveQuery(
    async () => (id ? interactionsService.listForEnquiry(id) : []),
    [id],
    { tables: ["interactions"] }
  );
  const { data: followups, refresh: refreshFollowups } = useLiveQuery(
    async () => (id ? followupsService.listForEnquiry(id) : []),
    [id],
    { tables: ["followups"] }
  );
  const { data: admins } = useLiveQuery(() => adminUsersService.list(), []);
  const { data: companies } = useLiveQuery(() => companiesService.list(), [], { tables: ["companies"] });

  const { changeStatus, modals } = useEnquiryWorkflow(() => {
    refresh();
    refreshFollowups();
  });

  if (loading || !enquiry) {
    return <SkeletonRows rows={5} />;
  }

  const assignedAdmin = admins?.find((a) => a.id === enquiry.assigned_to);
  const company = companies?.find((c) => c.enquiry_id === enquiry.id);
  const openFollowups = (followups ?? []).filter((f) => f.status === "SCHEDULED");

  const handlePatch = async (patch: Parameters<typeof enquiriesService.updatePatch>[1]) => {
    if (!id) return;
    await enquiriesService.updatePatch(id, patch);
    toast("Enquiry updated");
    refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/enquiries" className="flex w-fit items-center gap-1.5 text-xs text-muted hover:text-lime">
        <ArrowLeft size={13} /> Back to enquiries
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl text-offwhite">{enquiry.company_name}</h2>
              <PriorityBadge priority={enquiry.priority} />
              <StatusBadge status={enquiry.status} />
            </div>
            <p className="mt-1 text-sm text-muted">{enquiry.contact_name}</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {enquiry.status === "NEW" && (
              <Button size="sm" variant="secondary" onClick={() => changeStatus(enquiry, "CONTACTED")}>
                <ArrowRightCircle size={14} /> Mark Contacted
              </Button>
            )}
            {enquiry.status !== "CONVERTED" && enquiry.status !== "LOST" && (
              <Button size="sm" variant="secondary" onClick={() => changeStatus(enquiry, "FOLLOW_UP")}>
                <CalendarClock size={14} /> Schedule Follow-up
              </Button>
            )}
            {(enquiry.status === "CONTACTED" || enquiry.status === "FOLLOW_UP") && (
              <Button size="sm" onClick={() => changeStatus(enquiry, "CONVERTED")}>
                <CheckCircle2 size={14} /> Convert Lead
              </Button>
            )}
            {enquiry.status !== "CONVERTED" && enquiry.status !== "LOST" && (
              <Button size="sm" variant="danger" onClick={() => changeStatus(enquiry, "LOST")}>
                <XCircle size={14} /> Mark Lost
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-5 text-sm text-muted">
          <span className="flex items-center gap-2">
            <Phone size={14} className="text-dim" /> {enquiry.phone}
          </span>
          <span className="flex items-center gap-2">
            <Mail size={14} className="text-dim" /> {enquiry.email}
          </span>
          {enquiry.website && (
            <span className="flex items-center gap-2">
              <Globe size={14} className="text-dim" /> {enquiry.website}
            </span>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-5 font-display text-base text-offwhite">Pipeline</h3>
        <PipelineStepper status={enquiry.status} />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h3 className="mb-4 font-display text-base text-offwhite">Lead Information</h3>
            <dl className="flex flex-col gap-4 text-sm">
              <Row label="Service interested in" value={enquiry.service} />
              <Row label="Source" value={enquiry.source} />
              <Row label="Created" value={formatDate(enquiry.created_at)} />
              <div className="flex items-center justify-between">
                <dt className="text-xs uppercase tracking-wider text-dim">Assigned admin</dt>
                <dd>
                  <Select
                    value={enquiry.assigned_to ?? ""}
                    onChange={(e) => handlePatch({ assigned_to: e.target.value || null })}
                    className="!w-44 !py-1.5 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {admins?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.first_name} {a.last_name}
                      </option>
                    ))}
                  </Select>
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-xs uppercase tracking-wider text-dim">Priority</dt>
                <dd>
                  <Select
                    value={enquiry.priority}
                    onChange={(e) => handlePatch({ priority: e.target.value as LeadPriority })}
                    className="!w-44 !py-1.5 text-xs"
                  >
                    {LEAD_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </dd>
              </div>
              <Row
                label="Estimated value"
                value={enquiry.estimated_value != null ? `$${enquiry.estimated_value.toLocaleString()}` : "—"}
              />
              {assignedAdmin && <Row label="Last contact" value={formatDate(interactions?.[0]?.created_at)} />}
            </dl>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base text-offwhite">Follow-up</h3>
              {openFollowups.length > 0 && (
                <TimezoneToggle mode={zoneMode} onChange={setZoneMode} theirsAvailable={Boolean(assignedAdmin?.timezone)} companyAvailable={false} />
              )}
            </div>
            {openFollowups.length === 0 ? (
              <p className="text-sm text-dim">No follow-up scheduled.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {openFollowups.map((f) => {
                  const instant = followupInstant(f);
                  const overdue = instant.getTime() < Date.now();
                  const effectiveTimezone = zoneMode === "theirs" && assignedAdmin?.timezone ? assignedAdmin.timezone : viewerTimezone;
                  return (
                    <div key={f.id} className="rounded-md border border-border p-3.5">
                      <p className={`text-sm font-semibold ${overdue ? "text-danger" : "text-offwhite"}`}>
                        {formatDateTime(instant.toISOString(), effectiveTimezone)}
                      </p>
                      <p className="mt-1 text-xs text-muted">{f.contact_method}{f.notes ? ` · ${f.notes}` : ""}</p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            await followupsService.complete(f.id);
                            toast("Follow-up completed");
                            refreshFollowups();
                          }}
                        >
                          Complete
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
                            refreshFollowups();
                          }}
                        >
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-display text-base text-offwhite">Customer</h3>
            {company ? (
              <Link
                to={`/admin/customers/${company.id}`}
                className="flex items-center gap-3 rounded-md border border-lime/30 bg-lime/5 p-3.5 transition hover:bg-lime/10"
              >
                <Building2 size={18} className="text-lime" />
                <div>
                  <p className="text-sm font-semibold text-offwhite">{company.company_name}</p>
                  <p className="text-xs text-muted">View customer profile →</p>
                </div>
              </Link>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-dim">Not converted yet</p>
                <Button
                  size="sm"
                  disabled={enquiry.status === "CONVERTED" || enquiry.status === "LOST"}
                  onClick={() => changeStatus(enquiry, "CONVERTED")}
                  className="w-fit"
                >
                  Convert Lead
                </Button>
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-base text-offwhite">Conversation</h3>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add Interaction
            </Button>
          </div>
          <ConversationTimeline interactions={interactions ?? []} admins={admins ?? []} />
        </Card>
      </div>

      <AddInteractionModal
        open={addOpen}
        enquiry={enquiry}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          refreshInteractions();
          refreshFollowups();
        }}
      />
      {modals}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs uppercase tracking-wider text-dim">{label}</dt>
      <dd className="text-sm text-offwhite">{value || "—"}</dd>
    </div>
  );
}
