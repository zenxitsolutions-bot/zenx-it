import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function PublishReuseDialog({ open, onOpenChange, pending, onChoose }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save this meal schedule for reuse?</DialogTitle>
          <DialogDescription>
            Saving keeps it in your saved weekly plans so you can assign the same meals to another client later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() => onChoose(true)}
            className="rounded-full bg-coral text-white hover:bg-coral/90"
          >
            {pending ? 'Publishing…' : 'Yes, save and publish'}
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onChoose(false)}>
            No, just publish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
