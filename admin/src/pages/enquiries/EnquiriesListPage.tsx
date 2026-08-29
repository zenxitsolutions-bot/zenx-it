import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { useEnquiryWorkflow } from "../../hooks/useEnquiryWorkflow";
import { enquiriesService } from "../../services/enquiries";
import { followupsService } from "../../services/followups";
import { adminUsersService } from "../../services/adminUsers";
import { PipelineBoard } from "../../components/pipeline/PipelineBoard";
import { EnquiryTable } from "../../components/enquiries/EnquiryTable";
import { EnquiryFilters, type EnquiryFilterState } from "../../components/enquiries/EnquiryFilters";
import { AddEnquiryModal } from "../../components/enquiries/AddEnquiryModal";
import { Button } from "../../components/ui/Button";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { LEAD_PRIORITIES, type EnquiryStatus } from "../../types/domain";

const PRIORITY_RANK: Record<string, number> = Object.fromEntries(
  [...LEAD_PRIORITIES].reverse().map((p, i) => [p, i])
);

export default function EnquiriesListPage() {
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get("status") as EnquiryStatus | null) ?? "ALL";

  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const [addOpen, setAddOpen] = useState(false);
  const [filters, setFilters] = useState<EnquiryFilterState>({
    search: "",
    status: initialStatus,
    service: "ALL",
    source: "ALL",
    assignedTo: "ALL",
    sort: "newest",
  });

  const { data: enquiries, loading, refresh } = useLiveQuery(
    () => enquiriesService.list(),
    [],
    { tables: ["enquiries"] }
  );
  const { data: followups } = useLiveQuery(() => followupsService.list(), [], { tables: ["followups"] });
  const { data: admins } = useLiveQuery(() => adminUsersService.list(), []);

  const { changeStatus, modals } = useEnquiryWorkflow(refresh);

  const filtered = useMemo(() => {
    if (!enquiries) return [];
    const q = filters.search.trim().toLowerCase();
    let list = enquiries.filter((e) => {
      if (filters.status !== "ALL" && e.status !== filters.status) return false;
      if (filters.service !== "ALL" && e.service !== filters.service) return false;
      if (filters.source !== "ALL" && e.source !== filters.source) return false;
      if (filters.assignedTo !== "ALL" && e.assigned_to !== filters.assignedTo) return false;
      if (q) {
        const haystack = `${e.company_name} ${e.contact_name} ${e.phone} ${e.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (filters.sort === "newest") return +new Date(b.created_at) - +new Date(a.created_at);
      if (filters.sort === "oldest") return +new Date(a.created_at) - +new Date(b.created_at);
      if (filters.sort === "priority") return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (filters.sort === "followup") {
        const fa = followups?.find((f) => f.enquiry_id === a.id && f.status === "SCHEDULED");
        const fb = followups?.find((f) => f.enquiry_id === b.id && f.status === "SCHEDULED");
        const ta = fa ? +new Date(`${fa.scheduled_date}T${fa.scheduled_time}`) : Infinity;
        const tb = fb ? +new Date(`${fb.scheduled_date}T${fb.scheduled_time}`) : Infinity;
        return ta - tb;
      }
      return 0;
    });

    return list;
  }, [enquiries, filters, followups]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} /> Add Enquiry
        </Button>
      </div>

      <AddEnquiryModal
        open={addOpen}
        onClose={(created) => {
          setAddOpen(false);
          if (created) refresh();
        }}
      />

      <EnquiryFilters
        value={filters}
        onChange={setFilters}
        admins={admins ?? []}
        view={view}
        onViewChange={setView}
      />

      {loading || !enquiries ? (
        <SkeletonRows rows={5} />
      ) : view === "pipeline" ? (
        <PipelineBoard
          enquiries={filtered}
          admins={admins ?? []}
          followups={followups ?? []}
          onDropLead={(id, status) => {
            const enquiry = enquiries.find((e) => e.id === id);
            if (enquiry) changeStatus(enquiry, status);
          }}
        />
      ) : (
        <EnquiryTable enquiries={filtered} admins={admins ?? []} />
      )}

      {modals}
    </div>
  );
}
