// Bridges a booked call to the Google Meet integration.
//
// Kept separate from services/googleMeet.js (which knows Google) and services/callService.js
// (which knows booking) so neither has to know the other: this is the only place that decides
// what a call's meeting should be called, who is invited, and when a link is created, moved or
// removed.
//
// Every function here is best-effort by design. A Meet link is an enhancement to a call, never a
// precondition for one — so an unconfigured integration, a dietitian who never connected Google,
// an expired grant or a Google outage must all leave the call itself booked and notified exactly
// as before. Failures are logged, never thrown. Same reasoning as the non-fatal welcome email in
// admin-server's provisionCustomerAccount.
import { updateCallById } from '../models/Call.js';
import { findUserById } from '../models/User.js';
import { findEnquiryById } from '../models/Enquiry.js';
import { CALL_DURATION_MINUTES } from './availability.js';
import { createMeetingForCall, updateMeetingTime, cancelMeeting } from './googleMeet.js';

const MEETING_PROVIDER = 'google_meet';

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

    const [dietitian, attendee] = await Promise.all([findUserById(dietitianId), resolveAttendee(call)]);
    const who = attendee.name ?? 'client';

    const meeting = await createMeetingForCall({
      dietitianId,
      summary: `Nourishly consultation — ${who}`,
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
      meetingProvider: MEETING_PROVIDER,
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
