import { Video } from 'lucide-react';

// Renders the join link for a call that has one. A call only carries `meetingUrl` when the hosting
// dietitian has connected Google Calendar (server/src/services/callMeeting.js) — otherwise there
// is simply nothing to join, so this renders nothing rather than a disabled or fake button.
//
// Cancelled calls have their link cleared server-side, so `meetingUrl` alone is enough of a guard;
// `status` is still checked because a stale cached row can outlive the cancellation.
export function JoinMeetingButton({ call, className = '' }) {
  if (!call?.meetingUrl || call.status !== 'scheduled') return null;

  return (
    <a
      href={call.meetingUrl}
      target="_blank"
      // noreferrer alongside noopener: the tab is opened on the user's own calendar provider, and
      // there is no reason to leak the portal URL (which contains the company slug) as a referrer.
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-2 ${className}`}
    >
      <Video size={15} aria-hidden="true" />
      Join Google Meet
    </a>
  );
}
