import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { STATUS_LABEL, STATUSES } from '@/lib/enquiryStatus';

// Two ways to move a card between stages: drag it (mouse or dnd-kit's KeyboardSensor), or use
// the status dropdown directly — a fully independent, non-spatial keyboard/screen-reader path.
// A third interaction — clicking the name/goal area — opens the full history drawer; kept to just
// that inner block (not the whole card) so it doesn't fight the card's own drag listeners or the
// Select's own clicks.
export function EnquiryCard({ enquiry, onStatusChange, onOpenDetail, isPending }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: enquiry._id,
    data: { enquiry },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'grid min-w-0 cursor-grab gap-2 rounded-xl border border-line bg-white p-3 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sage-deep active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
    >
      <button type="button" onClick={onOpenDetail} className="grid min-w-0 gap-2 text-left [overflow-wrap:anywhere]">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <strong className="min-w-0 text-sm text-forest">{enquiry.name}</strong>
          <GripVertical className="size-4 shrink-0 text-sage-deep" aria-hidden="true" />
        </div>
        <span className="text-xs text-muted-foreground">{enquiry.goal}</span>
        {enquiry.preferredSlot && <span className="text-[11px] text-sage-deep">{enquiry.preferredSlot}</span>}
      </button>

      <Select value={enquiry.status} onValueChange={(status) => onStatusChange(status)} disabled={isPending}>
        <SelectTrigger size="sm" className="min-h-9 w-full min-w-0 px-2 py-1.5 text-left text-[11px] whitespace-normal data-[size=sm]:h-auto [&>[data-slot=select-value]]:block [&>[data-slot=select-value]]:min-w-0 [&>[data-slot=select-value]]:line-clamp-none [&>[data-slot=select-value]]:[overflow-wrap:anywhere]" aria-label={`Move ${enquiry.name} to a different stage`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
