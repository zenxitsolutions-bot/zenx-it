import { AlertTriangle, CalendarClock } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

// Read-only admin view: "a client's upcoming generated series and any occurrences that couldn't be
// placed" — both lists this schedule's own generation run already produces, just actually shown
// instead of only being used internally for the regenerate-confirm dialog.
export function ConsultationScheduleSeriesLists({ upcomingCalls, gaps }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-forest">
          <CalendarClock className="size-4" aria-hidden="true" />
          Upcoming series ({upcomingCalls.length})
        </h3>
        {upcomingCalls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming calls from this schedule yet.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {upcomingCalls.map((call) => (
              <li key={call._id} className="text-forest">
                {formatDateTime(call.scheduledAt)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-forest">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Needs attention ({gaps.length})
        </h3>
        {gaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing flagged.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {gaps.map((gap) => (
              <li key={gap._id}>
                <span className="font-medium text-forest">{formatDateTime(gap.occurrenceAt)}</span>
                <br />
                <span className="text-muted-foreground">{gap.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
