import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCalendarDate } from '@/lib/calendarDate';

// The caller captures the selected plan and owns the deletion mutation. This dialog never
// infers a "current" plan from dates, so confirming cannot target a different weekly plan.
export function DeletePlanDialog({ open, onOpenChange, plan, clientName, pending, onConfirm }) {
  if (!plan) return null;

  function handleOpenChange(nextOpen) {
    if (!pending) onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!pending}
        onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }}
        onInteractOutside={(event) => { if (pending) event.preventDefault(); }}
        aria-busy={pending || undefined}
      >
        <DialogHeader>
          <DialogTitle>Delete this diet plan?</DialogTitle>
          <DialogDescription>
            This permanently removes the plan from {clientName ? `${clientName}'s` : "the client's"} meal
            plans, including its meals and completion history. This cannot be undone. Recipes in the
            recipe library are not deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-line bg-cream p-3">
          <p className="break-words font-semibold text-forest">{plan.title || 'Untitled weekly plan'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCalendarDate(plan.week)} – {formatCalendarDate(plan.weekEnd || plan.week)}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} autoFocus onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? 'Deleting…' : 'Delete plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
