import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useEnquiryHistory } from '@/hooks/useEnquiries';
import { formatDateTime } from '@/lib/format';
import { STATUS_LABEL } from '@/lib/enquiryStatus';

// enquiry: null when closed, otherwise the card being inspected.
export function EnquiryDetailDrawer({ enquiry, onOpenChange }) {
  const open = Boolean(enquiry);
  const { data: history, isLoading } = useEnquiryHistory(enquiry?._id ?? null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {enquiry && (
          <>
            <SheetHeader>
              <SheetTitle>{enquiry.name}</SheetTitle>
              <SheetDescription>
                {enquiry.goal} · {enquiry.email} · {enquiry.phone}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-5 px-4 pb-4">
              <section>
                <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">History</h3>
                {isLoading ? (
                  <div className="mt-2 grid gap-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : !history?.length ? (
                  <EmptyState title="No history yet" description="Status changes will appear here." />
                ) : (
                  <ol className="mt-2 grid gap-2">
                    {history.map((entry) => (
                      <li key={entry._id} className="rounded-xl bg-cream p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary">{STATUS_LABEL[entry.status] ?? entry.status}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
                        </div>
                        {entry.note && <p className="mt-2 text-sm text-forest">{entry.note}</p>}
                        {entry.call && <p className="mt-1 text-xs text-sage-deep">Call booked</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
