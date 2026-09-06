import { findUserById } from '../models/User.js';
import { sendEmail } from '../emails/sendEmail.js';
import { env } from '../config/env.js';
import { formatInZone, effectiveTimezone } from './timezoneService.js';
import { canNotifyUser } from './notifyGuard.js';
import { portalPathUrl } from '../utils/urls.js';
import { notifyUserPush } from './pushNotifications.js';

// Every user (client or dietitian) can now have their own timezone (see users.timezone's comment
// in schema.sql), so each recipient's email renders the meeting time in THEIR OWN zone, not the
// dietitian's — two separately-correct emails for the same instant. `entity` may also be a bare
// {name, email} enquiry-contact stand-in with no timezone field (a not-yet-converted lead) —
// effectiveTimezone falls back to UTC for that case, same as any user with no saved preference.
function formatMeetingTime(date, entity) {
  const timezone = effectiveTimezone(entity);
  return `${formatInZone(date, timezone)} (${timezone})`;
}

// calls.meeting_provider -> the button text on the email. Falls back to a provider-neutral label
// rather than guessing: a row from a provider this build no longer knows about should still render
// a usable button, just without naming an app it might get wrong.
const JOIN_LABEL_BY_PROVIDER = {
  google_meet: 'Join Google Meet',
  jitsi: 'Join video call',
};
const providerJoinLabel = (provider) => JOIN_LABEL_BY_PROVIDER[provider] ?? 'Join video call';

const TEMPLATE_BY_EVENT = {
  booked: { client: 'call-scheduled', dietitian: 'call-scheduled-dietitian' },
  rescheduled: { client: 'call-rescheduled', dietitian: 'call-rescheduled-dietitian' },
  cancelled: { client: 'call-cancelled', dietitian: 'call-cancelled-dietitian' },
  // Fired by reminderScheduler.js, not a user action — same two-separate-emails machinery below
  // handles it identically (each recipient's own zone, idempotencyKey keyed off this event's own
  // template names so it can never collide with a booked/rescheduled/cancelled send for the same
  // call+sequence).
  reminder: { client: 'call-reminder', dietitian: 'call-reminder-dietitian' },
};

// One try/caught send per recipient — a failure sending to one party must never suppress the
// other, and neither may ever propagate out (see the caller, callService.js, for why: the booking/
// reschedule/cancellation itself has already succeeded by the time this runs).
async function trySend(to, templateKey, params, idempotencyKey, callId) {
  try {
    await sendEmail(to, templateKey, params, { idempotencyKey, relatedEntity: { type: 'appointment', id: callId } });
  } catch (err) {
    console.error(`[notifications] failed to queue ${templateKey} email to ${to} for call ${callId}:`, err);
  }
}

// event: 'booked' | 'rescheduled' | 'cancelled'. Sends TWO separate emails — one to the client (or,
// for a not-yet-converted follow-up, the enquiry's contact) and one to the dietitian — never one
// email addressed or CC'd to both. `previousScheduledAt` is required for 'rescheduled' (the
// template references {{previous_meeting_time}}) and ignored otherwise.
export async function notifyCallEvent(event, call, { previousScheduledAt } = {}) {
  const templates = TEMPLATE_BY_EVENT[event];
  const dietitian = await findUserById(call.dietitian?._id ?? call.dietitian).catch((err) => {
    console.error(`[notifications] could not resolve dietitian for call ${call.id}:`, err);
    return null;
  });
  if (!dietitian) return;

  const attendee = call.client
    ? await findUserById(call.client._id ?? call.client).catch(() => null)
    : call.enquiry
      ? { name: call.enquiry.name, email: call.enquiry.email }
      : null;

  const meetingLink = attendee?.companySlug || dietitian.companySlug
    ? portalPathUrl(attendee?.companySlug ? attendee : dietitian, '/app/calls')
    : `${env.clientOrigin}/app/calls`;
  // The real Google Meet room when the dietitian has connected Google (services/callMeeting.js),
  // otherwise the portal page — always a usable destination, so the templates need no conditional
  // (renderTemplate.js is plain {{token}} substitution and throws on a missing key).
  const joinUrl = call.meetingUrl || meetingLink;
  // Named after whichever provider actually created the room, not the currently-configured one —
  // a call booked before the setting changed still carries a working link from the old provider,
  // and labelling it with the new one would send people looking for the wrong app.
  const joinLabel = call.meetingUrl ? providerJoinLabel(call.meetingProvider) : 'View in ZenX Dietitian';
  // Two independently-correct renderings of the SAME UTC instant — the client's email uses the
  // client's (or lead's, defaulting to UTC) zone, the dietitian's email uses the dietitian's.
  const dietitianMeetingTime = formatMeetingTime(call.scheduledAt, dietitian);
  const dietitianPreviousMeetingTime = previousScheduledAt ? formatMeetingTime(previousScheduledAt, dietitian) : undefined;
  const attendeeMeetingTime = attendee ? formatMeetingTime(call.scheduledAt, attendee) : dietitianMeetingTime;
  const attendeePreviousMeetingTime = attendee && previousScheduledAt ? formatMeetingTime(previousScheduledAt, attendee) : dietitianPreviousMeetingTime;

  const icsBase = {
    callId: call.id,
    sequence: call.icsSequence,
    summary: `ZenX Dietitian call with ${dietitian.name}`,
    // The join link goes in the description as well as `url`: calendar clients differ in which
    // one they surface, and Google Calendar in particular renders the description body but not
    // every event URL field.
    description: call.meetingUrl
      ? `Your call with ${dietitian.name} via ZenX Dietitian.

Join: ${call.meetingUrl}`
      : `Your call with ${dietitian.name} via ZenX Dietitian.`,
    url: joinUrl,
    start: call.scheduledAt,
    organizer: { name: dietitian.name, email: dietitian.email },
  };

  if (canNotifyUser(attendee)) {
    await trySend(
      attendee.email,
      templates.client,
      {
        client_name: attendee.name,
        dietitian_name: dietitian.name,
        meeting_time: attendeeMeetingTime,
        previous_meeting_time: attendeePreviousMeetingTime,
        meeting_link: meetingLink,
        join_url: joinUrl,
        join_label: joinLabel,
        ics: { ...icsBase, attendee: { name: attendee.name, email: attendee.email } },
      },
      `${templates.client}:${call.id}:${call.icsSequence}:client`,
      call.id
    );
  }

  if (canNotifyUser(dietitian)) await trySend(
    dietitian.email,
    templates.dietitian,
    {
      client_name: attendee?.name ?? 'your client',
      dietitian_name: dietitian.name,
      meeting_time: dietitianMeetingTime,
      previous_meeting_time: dietitianPreviousMeetingTime,
      meeting_link: meetingLink,
      join_url: joinUrl,
      join_label: joinLabel,
      ics: {
        ...icsBase,
        attendee: attendee ? { name: attendee.name, email: attendee.email } : { name: dietitian.name, email: dietitian.email },
      },
    },
    `${templates.dietitian}:${call.id}:${call.icsSequence}:dietitian`,
    call.id
  );

  const pushTitle = event === 'reminder' ? 'Upcoming call' : event === 'cancelled' ? 'Call cancelled' : 'Call update';
  const pushBody = `With ${dietitian.name} — ${attendeeMeetingTime}`;
  if (attendee?.id && canNotifyUser(attendee)) {
    await notifyUserPush(attendee.id, { title: pushTitle, body: pushBody, url: meetingLink });
  }
  if (dietitian.id && canNotifyUser(dietitian)) {
    await notifyUserPush(dietitian.id, { title: pushTitle, body: `With ${attendee?.name ?? 'a client'} — ${dietitianMeetingTime}`, url: meetingLink });
  }
}
