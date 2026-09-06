import { Video } from 'lucide-react';

// Renders the join link for a call that has one. A call carries `meetingUrl` when the server
// attached a video room to it (server/src/services/callMeeting.js) — with the Jitsi provider that
// is every scheduled call, with Google only those whose dietitian has connected their calendar.
// When there is no link there is simply nothing to join, so this renders nothing rather than a
// disabled or fake button.
//
// Cancelled calls have their link cleared server-side, so `meetingUrl` alone is enough of a guard;
// `status` is still checked because a stale cached row can outlive the cancellation.

// Mirrors JOIN_LABEL_BY_PROVIDER in server/src/services/callNotifications.js so the button in the
// portal and the button in the email say the same thing. Keyed off the call's stored provider, not
// a build-time setting: a call booked under a previous provider keeps a working link, and must
// keep the label that matches it.
const LABEL_BY_PROVIDER = {
  google_meet: 'Join Google Meet',
  jitsi: 'Join video call',
};

export function JoinMeetingButton({ call, className = '' }) {
  if (!call?.meetingUrl || call.status !== 'scheduled') return null;

  const label = LABEL_BY_PROVIDER[call.meetingProvider] ?? 'Join video call';

  return (
    <a
      href={call.meetingUrl}
      target="_blank"
      // noreferrer alongside noopener: the tab is opened on a third-party video provider, and
      // there is no reason to leak the portal URL (which contains the company slug) as a referrer.
      rel="noopener noreferrer"
      className={`inline-flex h-10 items-center gap-2 rounded-pill bg-coral px-5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(0,60,50,0.18)] transition-all hover:bg-brand-strong hover:shadow-[0_4px_14px_rgba(0,60,50,0.24)] ${className}`}
    >
      <Video size={15} aria-hidden="true" />
      {label}
    </a>
  );
}
