// Bridges a booked call to whichever video provider the deployment uses.
//
// Kept separate from the provider modules (googleMeet.js / jitsiMeet.js, which know their own API)
// and from services/callService.js (which knows booking) so none of them has to know the others:
// this is the only place that decides what a call's meeting should be called, who is invited, and
// when a link is created, moved or removed.
//
// Every function here is best-effort by design. A meeting link is an enhancement to a call, never
// a precondition for one — so an unconfigured integration, a dietitian who never connected Google,
// an expired grant or a provider outage must all leave the call itself booked and notified exactly
// as before. Failures are logged, never thrown. Same reasoning as the non-fatal welcome email in
// admin-server's provisionCustomerAccount.
//
// Provider is chosen once, by MEETING_PROVIDER, not per call: a call's link has to keep working
// after the setting changes, so the provider that created a room is recorded on the row
// (calls.meeting_provider) and reschedule/cancel dispatch on THAT, not on the current setting.
import { updateCallById } from '../models/Call.js';
import { findUserById } from '../models/User.js';
import { findEnquiryById } from '../models/Enquiry.js';
import { env } from '../config/env.js';
import { CALL_DURATION_MINUTES } from './availability.js';
import { createMeetingForCall, createCalendarEventForCall, updateMeetingTime, cancelMeeting } from './googleMeet.js';
import { createMeetingRoom } from './jitsiMeet.js';

// Persisted in calls.meeting_provider. 'google_meet' is unchanged from before this file supported
// more than one provider, so existing rows keep resolving correctly.
const GOOGLE = 'google_meet';
const JITSI = 'jitsi';

const idOf = (value) => (value && typeof value === 'object' ? value._id ?? value.id : value) ?? null;

const endOf = (scheduledAt) => new Date(new Date(scheduledAt).getTime() + CALL_DURATION_MINUTES * 60_000);

// A call is with either a client account or a not-yet-converted enquiry (chk_calls_client_xor_enquiry),
// so the attendee has to be resolved from whichever one is set.
async function resolveAttendee(call) {
  const clientId = idOf(call.client);
  if (clientId) {
    const client = await findUserById(clientId);
    return { name: client?.name ?? null, email: client?.email ?? null };
  }
  const enquiryId = idOf(call.enquiry);
  if (enquiryId) {
    const enquiry = await findEnquiryById(enquiryId);
    return { name: enquiry?.name ?? null, email: enquiry?.email ?? null };
  }
  return { name: null, email: null };
}

/**
 * Creates the Meet room for a freshly booked call and persists it. Returns the call — updated with
 * meetingUrl when one was created, or unchanged when it wasn't.
 */
export async function attachMeetingToCall(call) {
  try {
    const dietitianId = idOf(call.dietitian);
    if (!dietitianId || call.status !== 'scheduled') return call;
    if (env.meetingProvider === 'none') return call;

    const [dietitian, attendee] = await Promise.all([findUserById(dietitianId), resolveAttendee(call)]);
    const who = attendee.name ?? 'client';

    // Jitsi: the room itself needs no grant, no lookup and no network call — it is just an
    // unguessable URL, and it is created first so the link exists even if everything Google-side
    // fails. The calendar event is then a strictly optional extra on top: when the dietitian has
    // connected Google, the appointment also lands on their calendar carrying the Jitsi link, with
    // no Google Meet room created alongside it (createCalendarEventForCall sends no conferenceData,
    // so there is never a second, unused room competing with the real one).
    if (env.meetingProvider === JITSI) {
      const { meetingUrl } = createMeetingRoom();
      const event = await createCalendarEventForCall({
        dietitianId,
        summary: `ZenX Dietitian consultation — ${who}`,
        description: [
          `Consultation with ${dietitian?.name ?? 'your dietitian'}.`,
          call.notes ? `\nNotes: ${call.notes}` : '',
        ]
          .join('')
          .trim(),
        startsAt: call.scheduledAt,
        endsAt: endOf(call.scheduledAt),
        attendeeEmails: [attendee.email],
        meetingUrl,
      });
      // googleEventId stays null when Google isn't configured or the dietitian never connected —
      // the call keeps its working Jitsi link either way, which is the whole point of doing the
      // room first.
      return await updateCallById(call.id, {
        meetingUrl,
        meetingProvider: JITSI,
        googleEventId: event?.eventId ?? null,
      });
    }

    const meeting = await createMeetingForCall({
      dietitianId,
      summary: `ZenX Dietitian consultation — ${who}`,
      description: [
        `Consultation with ${dietitian?.name ?? 'your dietitian'}.`,
        call.notes ? `\nNotes: ${call.notes}` : '',
      ]
        .join('')
        .trim(),
      startsAt: call.scheduledAt,
      endsAt: endOf(call.scheduledAt),
      // The dietitian is the organiser (it is their calendar), so only the other party is invited.
      attendeeEmails: [attendee.email],
    });
    if (!meeting) return call;

    return await updateCallById(call.id, {
      meetingUrl: meeting.meetingUrl,
      meetingProvider: GOOGLE,
      googleEventId: meeting.eventId,
    });
  } catch (err) {
    console.error('[callMeeting] attachMeetingToCall failed', err.message);
    return call;
  }
}

// A reschedule keeps the same room — the link already sent out stays valid, and only the event's
// time moves. If the call somehow has no event yet (booked while Google was down, or before the
// dietitian connected), this is the natural moment to create one.
export async function moveMeetingForCall(call, existingCall) {
  try {
    const provider = call.meetingProvider ?? existingCall.meetingProvider;
    const hasRoom = Boolean(call.meetingUrl ?? existingCall.meetingUrl);

    // A Jitsi room is a bare URL with no start time attached, so the room itself never moves — the
    // link already sent out stays valid. The Google Calendar event created alongside it does have
    // a time though, so it still has to be moved, or the dietitian's calendar keeps showing the
    // old slot. Best-effort as ever: a failure here leaves a stale calendar entry, not a broken
    // call, and the correct time still reaches everyone via the rescheduled email and its .ics.
    if (provider === JITSI) {
      if (!hasRoom) return attachMeetingToCall(call);
      const jitsiEventId = call.googleEventId ?? existingCall.googleEventId;
      const jitsiDietitianId = idOf(call.dietitian ?? existingCall.dietitian);
      if (jitsiEventId && jitsiDietitianId) {
        await updateMeetingTime({
          dietitianId: jitsiDietitianId,
          eventId: jitsiEventId,
          startsAt: call.scheduledAt,
          endsAt: endOf(call.scheduledAt),
        });
      }
      return call;
    }

    const dietitianId = idOf(call.dietitian ?? existingCall.dietitian);
    const eventId = call.googleEventId ?? existingCall.googleEventId;
    if (!dietitianId) return call;

    if (!eventId) return attachMeetingToCall(call);

    await updateMeetingTime({ dietitianId, eventId, startsAt: call.scheduledAt, endsAt: endOf(call.scheduledAt) });
    return call;
  } catch (err) {
    console.error('[callMeeting] moveMeetingForCall failed', err.message);
    return call;
  }
}

// Clears the stored link as well as deleting the event, so a cancelled call never renders a
// "Join" button pointing at a room that no longer exists.
export async function cancelMeetingForCall(call) {
  try {
    // Jitsi: the room needs no deletion (nothing was created server-side — an abandoned room is
    // simply never opened again), but the Google Calendar event created alongside it does, or the
    // dietitian is left with a cancelled appointment still sitting on their calendar.
    if (call.meetingProvider === JITSI) {
      const jitsiDietitianId = idOf(call.dietitian);
      if (call.googleEventId && jitsiDietitianId) {
        await cancelMeeting({ dietitianId: jitsiDietitianId, eventId: call.googleEventId });
      }
      return call.meetingUrl || call.googleEventId
        ? await updateCallById(call.id, { meetingUrl: null, meetingProvider: null, googleEventId: null })
        : call;
    }

    const dietitianId = idOf(call.dietitian);
    const eventId = call.googleEventId;
    if (!dietitianId || !eventId) return call;

    await cancelMeeting({ dietitianId, eventId });
    return await updateCallById(call.id, { meetingUrl: null, meetingProvider: null, googleEventId: null });
  } catch (err) {
    console.error('[callMeeting] cancelMeetingForCall failed', err.message);
    return call;
  }
}
