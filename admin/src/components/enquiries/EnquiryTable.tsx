import { Link } from "react-router-dom";
import type { Enquiry, Profile } from "../../types/domain";
import { StatusBadge, PriorityBadge } from "../ui/Badges";
import { EmptyState } from "../ui/EmptyState";
import { formatDate } from "../../utils/date";
import { SearchX } from "lucide-react";

export function EnquiryTable({ enquiries, admins }: { enquiries: Enquiry[]; admins: Profile[] }) {
  const adminById = new Map(admins.map((a) => [a.id, a]));

  if (enquiries.length === 0) {
    return <EmptyState icon={SearchX} title="No enquiries found" description="Try adjusting your search or filters." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl2 border border-border">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-panel text-[11px] uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Service</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Assigned</th>
            <th className="px-4 py-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((e) => {
            const admin = e.assigned_to ? adminById.get(e.assigned_to) : undefined;
            return (
              <tr key={e.id} className="border-t border-border transition hover:bg-white/5">
                <td className="px-4 py-3">
                  <Link to={`/admin/enquiries/${e.id}`} className="font-semibold text-offwhite hover:text-lime">
                    {e.company_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{e.contact_name}</td>
                <td className="px-4 py-3 text-muted">{e.service}</td>
                <td className="px-4 py-3 text-muted">{e.source}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={e.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={e.priority} />
                </td>
                <td className="px-4 py-3 text-muted">{admin ? `${admin.first_name} ${admin.last_name}` : "—"}</td>
                <td className="px-4 py-3 text-dim">{formatDate(e.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
