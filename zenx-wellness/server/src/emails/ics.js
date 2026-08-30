import ical, { ICalCalendarMethod, ICalEventStatus } from 'ical-generator';
import { CALL_DURATION_MINUTES } from '../services/availability.js';

// One UID per appointment, for its entire life — derived purely from the call's own id, which
// never changes across a reschedule (a reschedule updates the same `calls` row in place; see
// call.controller.js#updateCall). This is what lets a reschedule/cancellation update or remove the
// one event a calendar client already imported instead of creating a second one — the single most
// common way .ics integrations break. Never persisted separately; always recomputed from callId so
// there's nothing to get out of sync.
export function icsUidForCall(callId) {
  return `call-${callId}@nourishly.app`;
}

const PROD_ID = { company: 'Nourishly', product: 'Scheduling', language: 'EN' };

// method/status are fixed per call site (buildRequestIcs/buildCancelIcs below); everything else
// comes from the caller. `sequence` must be the same monotonically-increasing counter for a given
// callId across every call (calls.ics_sequence — bumped by call.controller.js on every reschedule
// and again on cancellation) or calendar clients have no reliable way to tell a revision from a
// duplicate.
function buildCalendar({ method, status, callId, sequence, summary, description, url, start, end, organizer, attendee }) {
  const calendar = ical({ prodId: PROD_ID, method });
  calendar.createEvent({
    id: icsUidForCall(callId),
    sequence,
    status,
    // Coerced explicitly (params.start may be an ISO string after a JSON round-trip through
    // email_log.params — see sendEmail.js) rather than trusting ical-generator to infer the same
    // UTC-instant meaning from a bare string that it does from a Date.
    start: new Date(start),
    end,
    summary,
    description,
    url,
    organizer: { name: organizer.name, email: organizer.email },
    attendees: [{ name: attendee.name, email: attendee.email, rsvp: true }],
  });
  // Explicit UTC instants with a Z suffix, never a floating local time: `start`/`end` are always
  // real Date objects (an absolute instant) here, and neither `floating` nor a per-event
  // `timezone` is ever set — ical-generator serializes a bare Date as `...Z` by default.
  return calendar.toString();
}

function deriveEnd(params) {
  return params.end ?? new Date(new Date(params.start).getTime() + CALL_DURATION_MINUTES * 60_000);
}

// Booking AND reschedule both use METHOD:REQUEST — a reschedule is just a new REQUEST for the same
// UID with a higher SEQUENCE, per RFC 5545; it is not a separate mechanism.
export function buildRequestIcs(params) {
  return buildCalendar({ ...params, end: deriveEnd(params), method: ICalCalendarMethod.REQUEST, status: ICalEventStatus.CONFIRMED });
}

export function buildCancelIcs(params) {
  return buildCalendar({ ...params, end: deriveEnd(params), method: ICalCalendarMethod.CANCEL, status: ICalEventStatus.CANCELLED });
}

// Per-templateKey wiring: which templates carry a calendar invite, and via which method. Templates
// with no entry here (client-welcome, plan-published, enquiry-acknowledgment) never get an .ics
// attachment. The client-facing and dietitian-facing template for the same event (e.g.
// call-scheduled / call-scheduled-dietitian) share the exact same builder — one .ics generator,
// reused by every recipient of every call-related email, per the earlier "one .ics generator used
// by booking/reschedule/cancellation" requirement; only the human-readable HTML/text differs.
const ICS_BUILDERS = {
  'call-scheduled': { build: buildRequestIcs, filename: 'invite.ics', method: 'REQUEST' },
  'call-scheduled-dietitian': { build: buildRequestIcs, filename: 'invite.ics', method: 'REQUEST' },
  'call-rescheduled': { build: buildRequestIcs, filename: 'invite.ics', method: 'REQUEST' },
  'call-rescheduled-dietitian': { build: buildRequestIcs, filename: 'invite.ics', method: 'REQUEST' },
  'call-cancelled': { build: buildCancelIcs, filename: 'cancel.ics', method: 'CANCEL' },
  'call-cancelled-dietitian': { build: buildCancelIcs, filename: 'cancel.ics', method: 'CANCEL' },
};

// Builds the email attachment for a template, from the `ics` sub-object a call-related template's
// params carries alongside its human-readable placeholders (see call.controller.js). Returns null
// for a template with no calendar invite (e.g. client-welcome). The attachment's content-type
// carries `method=...` (required for Gmail's invite handling) *and* is a real, named .ics file
// (what Outlook expects) — one attachment satisfies both, rather than needing separate inline vs.
// downloadable representations.
export function buildIcsAttachment(templateKey, params) {
  const config = ICS_BUILDERS[templateKey];
  if (!config || !params.ics) return null;

  const content = config.build(params.ics);
  return {
    filename: config.filename,
    contentType: `text/calendar; charset=utf-8; method=${config.method}`,
    content,
  };
}
