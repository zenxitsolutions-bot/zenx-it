import { Button } from '@/components/ui/button';

export function PaginationControls({ page, totalPages, itemCount, pageSize, onPageChange, itemLabel = 'items' }) {
  if (totalPages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, itemCount);

  return (
    <nav className="mt-5 flex flex-wrap items-center justify-between gap-3" aria-label={`${itemLabel} pagination`}>
      <p className="text-sm text-muted-foreground">
        Showing {first}–{last} of {itemCount} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="text-sm font-medium text-forest" aria-current="page">
          Page {page} of {totalPages}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
