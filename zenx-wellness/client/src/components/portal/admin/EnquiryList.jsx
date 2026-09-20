import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_LABEL, STATUSES } from '@/lib/enquiryStatus';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/portal/shared/PaginationControls';

export function EnquiryList({ enquiries, pendingId, onStatusChange, onOpenDetail }) {
  const pagination = usePagination(enquiries, { pageSize: 20 });

  return (
    <div className="rounded-card border border-line bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Enquiries and their current pipeline stages</caption>
        <thead><tr className="border-b border-line">
          {['Name', 'Contact', 'Goal', 'Preferred slot', 'Stage', 'Details'].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}
        </tr></thead>
        <tbody>
          {pagination.pageItems.map((enquiry) => (
            <tr key={enquiry._id} className="border-b border-line last:border-0 hover:bg-cream/70">
              <td className="px-4 py-4 font-medium text-forest"><button type="button" onClick={() => onOpenDetail(enquiry)} className="text-left hover:underline">{enquiry.name}</button></td>
              <td className="px-4 py-4 text-muted-foreground"><span className="block">{enquiry.email || '—'}</span><span className="block text-xs">{enquiry.phone || '—'}</span></td>
              <td className="max-w-64 px-4 py-4 text-muted-foreground">{enquiry.goal || '—'}</td>
              <td className="px-4 py-4 text-muted-foreground">{enquiry.preferredSlot || '—'}</td>
              <td className="px-4 py-4">
                <Select value={enquiry.status} onValueChange={(status) => onStatusChange(enquiry, status)} disabled={pendingId === enquiry._id}>
                  <SelectTrigger className="w-36" aria-label={`Move ${enquiry.name} to a different stage`}><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABEL[status]}</SelectItem>)}</SelectContent>
                </Select>
              </td>
              <td className="px-4 py-4"><button type="button" onClick={() => onOpenDetail(enquiry)} aria-label={`View enquiry from ${enquiry.name}`} className="min-h-11 font-medium text-forest hover:underline">View →</button></td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      <div className="px-4 pb-4">
        <PaginationControls {...pagination} onPageChange={pagination.setPage} itemLabel="enquiries" />
      </div>
    </div>
  );
}
