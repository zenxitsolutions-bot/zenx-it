import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUpdateCall } from '@/hooks/useCalls';
import { formatDate, formatTime } from '@/lib/format';

const STATUS_VARIANT = { scheduled: 'default', completed: 'secondary', cancelled: 'outline' };

// Spec §6 item 5: per-call notes, editable any time (before/during/after), linked to and shown
// with that specific call in the history.
export function ClientCallHistoryCard({ call }) {
  const updateCall = useUpdateCall();
  const [notes, setNotes] = useState(call.notes ?? '');
  const dirty = notes !== (call.notes ?? '');

  function save() {
    updateCall.mutate(
      { callId: call._id, notes },
      {
        onSuccess: () => toast.success('Note saved.'),
        onError: () => toast.error("That didn't save — please try again."),
      }
    );
  }

  return (
    <article className="rounded-card bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <strong className="block text-sm text-forest">
            {formatDate(call.scheduledAt, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </strong>
          <span className="text-xs text-muted-foreground">{formatTime(call.scheduledAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {call.isRescheduled && <Badge variant="outline">Rescheduled</Badge>}
          <Badge variant={STATUS_VARIANT[call.status]} className="capitalize">
            {call.status}
          </Badge>
        </div>
      </div>

      {call.isRescheduled && call.originalScheduledAt && (
        <p className="mt-1 text-xs text-muted-foreground">
          Originally {formatDate(call.originalScheduledAt)} · {formatTime(call.originalScheduledAt)}
        </p>
      )}

      <label className="mt-3 block">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Note</span>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note for this call — before, during, or after."
          className="mt-1"
          rows={2}
        />
      </label>
      {dirty && (
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={save}
            disabled={updateCall.isPending}
            className="rounded-full bg-coral text-white hover:bg-coral/90"
          >
            {updateCall.isPending ? 'Saving…' : 'Save note'}
          </Button>
        </div>
      )}
    </article>
  );
}
