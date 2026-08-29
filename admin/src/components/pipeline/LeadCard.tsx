import { Link } from "react-router-dom";
import { Phone, Mail, DollarSign } from "lucide-react";
import type { Enquiry, Followup, Profile } from "../../types/domain";
import { PriorityBadge } from "../ui/Badges";
import { formatDateShort } from "../../utils/date";

interface LeadCardProps {
  enquiry: Enquiry;
  admin?: Profile;
  nextFollowup?: Followup;
  onDragStart: (id: string) => void;
}

export function LeadCard({ enquiry, admin, nextFollowup, onDragStart }: LeadCardProps) {
  return (
    <Link
      to={`/admin/enquiries/${enquiry.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", enquiry.id);
        onDragStart(enquiry.id);
      }}
      className="block cursor-grab rounded-md border border-border bg-surface/70 p-3.5 transition hover:border-lime/40 hover:bg-white/5 active:cursor-grabbing"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight text-offwhite">{enquiry.company_name}</p>
        <PriorityBadge priority={enquiry.priority} />
      </div>
      <p className="text-xs text-muted">{enquiry.contact_name}</p>

      <div className="mt-3 flex flex-col gap-1 text-[11px] text-dim">
        <span className="flex items-center gap-1.5">
          <Phone size={11} /> {enquiry.phone}
        </span>
        <span className="flex items-center gap-1.5 truncate">
          <Mail size={11} /> {enquiry.email}
        </span>
        {enquiry.estimated_value != null && (
          <span className="flex items-center gap-1.5">
            <DollarSign size={11} /> {enquiry.estimated_value.toLocaleString()}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[10px] text-dim">
        <span className="rounded-full bg-white/5 px-2 py-1">{enquiry.service}</span>
        <span>{formatDateShort(enquiry.created_at)}</span>
      </div>

      {(admin || nextFollowup) && (
        <div className="mt-2 flex items-center justify-between text-[10px] text-dim">
          <span>{admin ? `${admin.first_name} ${admin.last_name}` : "Unassigned"}</span>
          {nextFollowup && (
            <span className="text-lime">
              Next: {formatDateShort(nextFollowup.scheduled_date)}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
