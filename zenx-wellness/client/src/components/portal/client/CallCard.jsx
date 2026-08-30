import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useUpdateCall } from '@/hooks/useCalls';
import { formatDate, formatTime } from '@/lib/format';
import { JoinMeetingButton } from '@/components/portal/shared/JoinMeetingButton';

const STATUS_VARIANT = { scheduled: 'default', completed: 'secondary', cancelled: 'outline' };

export function CallCard({ call, onReschedule }) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const updateCall = useUpdateCall();
  const isPast = call.status !== 'scheduled';

  function cancel() {
    updateCall.mutate(
      { callId: call._id, status: 'cancelled' },
      {
        onSuccess: () => toast.success('Call cancelled.'),
        onError: () => toast.error("We couldn't cancel that — please try again."),
      }
    );
    setConfirmingCancel(false);
  }

  return (
    <article className="rounded-card bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg text-forest">
            {formatDate(call.scheduledAt, { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
          <p className="text-sm text-muted-foreground">{formatTime(call.scheduledAt)} · with {call.dietitian?.name ?? 'your dietitian'}</p>
          {call.notes && <p className="mt-1 text-sm text-forest">{call.notes}</p>}
        </div>
        <Badge variant={STATUS_VARIANT[call.status]} className="capitalize">
          {call.status}
        </Badge>
      </div>

      <JoinMeetingButton call={call} className="mt-4" />

      {!isPast && (
        <div className="mt-4 flex items-center gap-4">
          {confirmingCancel ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-forest">Cancel this call?</span>
              <button type="button" onClick={cancel} disabled={updateCall.isPending} className="font-semibold text-destructive hover:underline">
                Yes, cancel
              </button>
              <button type="button" onClick={() => setConfirmingCancel(false)} className="text-muted-foreground hover:underline">
                Never mind
              </button>
            </div>
          ) : (
            <>
              <button type="button" onClick={onReschedule} className="text-sm font-semibold text-forest hover:underline">
                Reschedule
              </button>
              <button type="button" onClick={() => setConfirmingCancel(true)} className="text-sm font-semibold text-destructive hover:underline">
                Cancel call
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
