import { createCall as createCallRecord, updateCallById } from '../models/Call.js';
import { withTransaction } from '../db/pool.js';
import { assertSlotAvailable } from './availabilityGuard.js';
import { notifyCallEvent } from './callNotifications.js';
import { attachMeetingToCall, moveMeetingForCall, cancelMeetingForCall } from './callMeeting.js';

// The one place a call is ever booked, from ANY entry point (call.controller.js's POST /calls, and
// enquiry.controller.js's Follow-up flow) — both call this instead of models/Call.js#createCall
// directly, specifically so the booking email can never be skipped just because a second entry
// point exists. (It used to be: the Follow-up flow called the model directly, bypassing the email
// entirely — the concrete bug this refactor fixes.)
export async function bookCall({
  client = null,
  enquiry = null,
  dietitian,
  scheduledAt,
  notes = null,
  reminderMinutesBefore = null,
  consultationScheduleId = null,
  force = false,
  // Only for the consultation-schedule batch-generation path (consultationScheduleService.js),
  // which decides notification itself once it knows how many calls a single run actually produced
  // — see that module for why. Every other caller leaves this false and gets the normal email.
  skipNotification = false,
}) {
  const payload = { client, enquiry, dietitian, scheduledAt, notes, reminderMinutesBefore, consultationScheduleId };
  const call = force
    ? await createCallRecord(payload)
    : await withTransaction(async (conn) => {
        await assertSlotAvailable({ dietitianId: dietitian, scheduledAt }, conn);
        return createCallRecord(payload, conn);
      });

  // Before the notification, so the booking email and its .ics invite can carry the join link.
  // Never throws and never blocks the booking — see services/callMeeting.js.
  const withMeeting = await attachMeetingToCall(call);

  if (!skipNotification) await notifyCallEvent('booked', withMeeting);
  return withMeeting;
}

// existingCall: the pre-update call row (for transition detection — did scheduledAt actually
// change, is this a genuine cancellation). patch: the already permission-filtered patch from the
// caller (role/ownership/allowedKeys checks stay in the controller — an HTTP-layer concern, not a
// domain one). Bumps calls.ics_sequence once per state change that affects the calendar invite,
// same rule as before this refactor: a request that is somehow both a reschedule and a
// cancellation at once bumps twice and only the cancellation email fires.
export async function applyCallUpdate(callId, existingCall, patch, { force = false } = {}) {
  const dietitianId = existingCall.dietitian?._id ?? existingCall.dietitian;

  const isReschedule = Boolean(
    patch.scheduledAt && new Date(patch.scheduledAt).getTime() !== new Date(existingCall.scheduledAt).getTime()
  );
  const isCancellation = patch.status === 'cancelled' && existingCall.status !== 'cancelled';

  let finalPatch = patch;
  if (isReschedule) {
    finalPatch = { ...patch, rescheduledAt: new Date(), originalScheduledAt: existingCall.originalScheduledAt ?? existingCall.scheduledAt };
  }
  if (isReschedule || isCancellation) {
    finalPatch = { ...finalPatch, icsSequence: existingCall.icsSequence + (isReschedule ? 1 : 0) + (isCancellation ? 1 : 0) };
  }

  const updated =
    patch.scheduledAt && !force
      ? await withTransaction(async (conn) => {
          await assertSlotAvailable({ dietitianId, scheduledAt: patch.scheduledAt, excludeCallId: callId }, conn);
          return updateCallById(callId, finalPatch, conn);
        })
      : await updateCallById(callId, finalPatch);

  // Keep the Google Calendar event in step with the row: move it on a reschedule (so the same
  // Meet link stays valid and the dietitian's calendar is correct), delete it on a cancellation
  // (so a cancelled call doesn't leave a live meeting behind). Both are best-effort.
  if (isCancellation) {
    await cancelMeetingForCall(updated);
    await notifyCallEvent('cancelled', updated);
  } else if (isReschedule) {
    await moveMeetingForCall(updated, existingCall);
    await notifyCallEvent('rescheduled', updated, { previousScheduledAt: existingCall.scheduledAt });
  }

  return updated;
}
