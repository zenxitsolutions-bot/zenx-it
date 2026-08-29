import { ENQUIRY_STATUSES, type Enquiry, type EnquiryStatus, type Followup, type Profile } from "../../types/domain";
import { PipelineColumn } from "./PipelineColumn";
import { LeadCard } from "./LeadCard";
import { EmptyState } from "../ui/EmptyState";
import { Inbox } from "lucide-react";

interface PipelineBoardProps {
  enquiries: Enquiry[];
  admins: Profile[];
  followups: Followup[];
  onDropLead: (id: string, status: EnquiryStatus) => void;
}

export function PipelineBoard({ enquiries, admins, followups, onDropLead }: PipelineBoardProps) {
  const adminById = new Map(admins.map((a) => [a.id, a]));

  const nextFollowupFor = (enquiryId: string): Followup | undefined => {
    return followups
      .filter((f) => f.enquiry_id === enquiryId && f.status === "SCHEDULED")
      .sort((a, b) => +new Date(`${a.scheduled_date}T${a.scheduled_time}`) - +new Date(`${b.scheduled_date}T${b.scheduled_time}`))[0];
  };

  if (enquiries.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No enquiries found"
        description="New website enquiries will appear here automatically."
      />
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-3">
      {ENQUIRY_STATUSES.map((status) => {
        const items = enquiries.filter((e) => e.status === status);
        return (
          <PipelineColumn key={status} status={status} count={items.length} onDropLead={onDropLead}>
            {items.length === 0 ? (
              <p className="py-8 text-center text-xs text-dim">No leads here.</p>
            ) : (
              items.map((enquiry) => (
                <LeadCard
                  key={enquiry.id}
                  enquiry={enquiry}
                  admin={enquiry.assigned_to ? adminById.get(enquiry.assigned_to) : undefined}
                  nextFollowup={nextFollowupFor(enquiry.id)}
                  onDragStart={() => {}}
                />
              ))
            )}
          </PipelineColumn>
        );
      })}
    </div>
  );
}
