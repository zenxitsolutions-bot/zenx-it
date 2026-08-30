import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { EnquiryCard } from './EnquiryCard';

export function EnquiryColumn({ status, label, enquiries, onStatusChange, onOpenDetail, pendingId }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-w-[220px] flex-1 flex-col gap-2.5 rounded-card bg-[#f3f5ef] p-3 transition-colors',
        isOver && 'bg-sage/40'
      )}
    >
      <h3 className="px-1 text-xs font-bold tracking-wide text-forest uppercase">
        {label} · {enquiries.length}
      </h3>
      <div className="grid gap-2">
        {enquiries.map((enquiry) => (
          <EnquiryCard
            key={enquiry._id}
            enquiry={enquiry}
            isPending={pendingId === enquiry._id}
            onStatusChange={(status) => onStatusChange(enquiry, status)}
            onOpenDetail={() => onOpenDetail(enquiry)}
          />
        ))}
      </div>
    </div>
  );
}
