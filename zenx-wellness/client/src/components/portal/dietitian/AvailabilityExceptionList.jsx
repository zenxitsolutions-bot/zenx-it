import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAvailabilityExceptions, useDeleteAvailabilityException } from '@/hooks/useAvailability';
import { formatDateTime } from '@/lib/format';
import { describeExceptionKind } from '@/lib/availability';

export function AvailabilityExceptionList() {
  const { data, isLoading } = useAvailabilityExceptions();
  const deleteException = useDeleteAvailabilityException();

  if (isLoading) {
    return (
      <div className="grid gap-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No blocks or extra hours yet"
        description="Add a blocked date, a time off, or extra hours for a specific day."
      />
    );
  }

  function handleDelete(id) {
    deleteException.mutate(id, { onError: () => toast.error("We couldn't remove that — please try again.") });
  }

  return (
    <ul className="grid gap-2">
      {data.map((exception) => (
        <li
          key={exception._id}
          className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant={exception.kind === 'closed' ? 'destructive' : 'secondary'}>
                {describeExceptionKind(exception.kind)}
              </Badge>
              <span className="text-sm text-forest">
                {formatDateTime(exception.startAt)} – {formatDateTime(exception.endAt)}
              </span>
            </div>
            {exception.note && <p className="mt-1 truncate text-sm text-muted-foreground">{exception.note}</p>}
          </div>
          <button
            type="button"
            onClick={() => handleDelete(exception._id)}
            disabled={deleteException.isPending}
            aria-label="Remove this block"
            className="shrink-0 text-muted-foreground hover:text-coral"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
