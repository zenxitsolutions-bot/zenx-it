import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';

// Shown only when saving an EXISTING schedule whose pattern actually changed AND it already has
// upcoming generated calls — the explicit "ask, never silently rewrite or orphan" moment this
// feature was built around. `onConfirm(regenerate: boolean)` is called with the user's choice;
// the caller (ConsultationScheduleTab) does the actual save with that flag.
export function ConsultationScheduleRegenerateDialog({ open, onOpenChange, affectedCalls, onConfirm, isPending }) {
  const count = affectedCalls.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Update the {count} upcoming call{count === 1 ? '' : 's'} too?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">This schedule already has these booked:</p>
        <ul className="grid max-h-40 gap-1 overflow-y-auto text-sm">
          {affectedCalls.map((call) => (
            <li key={call._id} className="text-forest">
              {formatDateTime(call.scheduledAt)}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Regenerating cancels these and books new ones matching the updated schedule. Leaving them
          keeps these calls exactly as they are — only the schedule's settings change.
        </p>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onConfirm(false)}>
            Leave them as they are
          </Button>
          <Button type="button" disabled={isPending} onClick={() => onConfirm(true)} className="bg-coral text-white hover:bg-coral/90">
            Regenerate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
