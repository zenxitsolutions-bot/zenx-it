import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

// Jitsi Meet as a video-call provider. Deliberately the opposite shape to googleMeet.js: there is
// no API, no OAuth, no per-dietitian grant and no server-side event to keep in sync — a Jitsi room
// exists the moment someone opens its URL. So "creating" a meeting is generating a name, and the
// whole provider is synchronous and cannot fail, which is why none of these return null the way
// the Google functions do.
//
// SECURITY — read before changing the room name. On the public meet.jit.si instance a room has no
// access control: anyone who knows (or guesses) its name is in the call. The name IS the secret.
// That rules out anything derived from data an attacker can see or enumerate — a call id, a
// client name, a sequential number, a timestamp. 16 random bytes (128 bits) is the whole of the
// protection, so the room name must stay unguessable even though it looks ugly in the URL.
//
// The generated URL is stored on the call (calls.meeting_url), so it is generated exactly once and
// never re-derived — there is no way to recompute a room name from a call, by design.
const ROOM_ENTROPY_BYTES = 16;

// A per-deployment prefix keeps rooms from this app visually identifiable and, on a self-hosted
// instance, groups them for moderation config. It adds no security — treat it as public.
const ROOM_PREFIX = 'zenx-dietitian';

export function isJitsiConfigured() {
  // Unlike Google there is nothing to configure: the public instance works with no credentials.
  // The env var only exists so a deployment can point at its own Jitsi server later.
  return Boolean(env.jitsiBaseUrl);
}

/**
 * Builds a fresh, unguessable room URL. Synchronous and total — no network call, no failure mode.
 * @returns {{ meetingUrl: string, roomName: string }}
 */
export function createMeetingRoom() {
  const roomName = `${ROOM_PREFIX}-${randomBytes(ROOM_ENTROPY_BYTES).toString('hex')}`;
  const base = env.jitsiBaseUrl.replace(/\/+$/, '');
  return { meetingUrl: `${base}/${roomName}`, roomName };
}

/**
 * A Jitsi room is not bound to a time — it is simply a URL that works whenever it is opened. So a
 * rescheduled call keeps the room it already has and there is nothing to move, which is why this
 * exists as an explicit no-op rather than being omitted: callMeeting.js dispatches to the same
 * three functions for every provider and must not branch on which one is active.
 */
export function updateMeetingTime() {
  return true;
}

/**
 * Nothing to delete server-side — no event was ever created on anyone's calendar. The caller still
 * clears calls.meeting_url so a cancelled call stops rendering a Join button; the abandoned room
 * simply never gets opened again.
 */
export function cancelMeeting() {
  return true;
}
