import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { EnquiryCard } from './EnquiryCard';
import { STATUS_DOT } from '@/lib/enquiryStatus';

export function EnquiryColumn({ status, label, enquiries, onStatusChange, onOpenDetail, pendingId }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-36 min-w-0 flex-col gap-2.5 rounded-card bg-cream p-2.5 transition-colors',
        isOver && 'bg-sage/40'
      )}
    >
      {/* A colored dot per column carries the status identity without tinting the whole column,
          which would fight the cards sitting on it. Same hues as the CRM's pipeline. */}
      <h3 className="flex min-h-12 items-start gap-1.5 px-0.5 text-xs leading-4 font-bold tracking-wide text-forest uppercase">
        <span className={cn('mt-1 size-2 shrink-0 rounded-full', STATUS_DOT[status])} aria-hidden="true" />
        <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
        <span className="ml-auto shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {enquiries.length}
        </span>
      </h3>
      <div className="grid min-w-0 gap-2">
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
