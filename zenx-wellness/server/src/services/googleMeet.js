// Google Calendar / Meet integration.
//
// Per-dietitian OAuth: each dietitian connects their own Google account once, we keep the refresh
// token (models/GoogleToken.js), and every call they host is created as a Calendar event on their
// calendar with `conferenceData.createRequest` — which is the only way to get a real, joinable
// Meet room. Meet codes cannot be minted locally; anything hand-generated is a dead link.
//
// Deliberately built on global fetch rather than the `googleapis` package: the three endpoints
// needed here (token exchange, token refresh, events insert/patch/delete) are small REST calls,
// and CLAUDE.md §2 asks before adding to the stack. Node 24 has fetch built in.
//
// EVERY export is a no-op-and-return-null when the integration isn't configured or the dietitian
// hasn't connected. Booking a call must never fail because Google is down, misconfigured, or the
// dietitian never connected — the call is the product, the Meet link is an enhancement. Callers
// treat a null return as "no link", exactly like the non-fatal welcome email in
// admin-server's provisionCustomerAccount.
import { env } from '../config/env.js';
import { findGoogleToken, saveGoogleTokens, updateAccessToken, deleteGoogleToken } from '../models/GoogleToken.js';

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// calendar.events is the narrowest scope that can create an event with a Meet room attached.
// userinfo.email is only so the UI can show *which* Google account is connected.
const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email'];

// Refresh a little before the real expiry so a request never races the boundary.
const EXPIRY_SKEW_MS = 60 * 1000;

export function isGoogleConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

// `state` carries the dietitian's own user id, signed by the caller (integrations.controller.js)
// so the callback can't be replayed to attach someone else's Google account to this account.
export function buildAuthUrl(state) {
  if (!isGoogleConfigured()) return null;
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    // offline + consent together are what actually return a refresh_token. Without prompt=consent
    // Google omits it on every grant after the first, which silently leaves the connection unable
    // to survive the first access-token expiry.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

async function postForm(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Google ${url} failed (${res.status}): ${data?.error_description || data?.error || 'unknown error'}`);
  }
  return data;
}

// Exchanges the one-time code from the consent redirect and persists the grant.
export async function exchangeCodeAndStore(userId, code) {
  if (!isGoogleConfigured()) throw new Error('Google integration is not configured');

  const token = await postForm(OAUTH_TOKEN_URL, {
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: env.googleRedirectUri,
    grant_type: 'authorization_code',
  });

  if (!token.refresh_token) {
    // Happens when the account already granted this client and Google withheld a new refresh
    // token. prompt=consent above is meant to prevent it; surfaced rather than stored half-broken.
    throw new Error('Google did not return a refresh token — revoke the app at myaccount.google.com/permissions and reconnect');
  }

  let googleEmail = null;
  try {
    const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${token.access_token}` } });
    googleEmail = (await res.json())?.email ?? null;
  } catch {
    // Cosmetic only — the connection works without knowing which address it belongs to.
  }

  await saveGoogleTokens({
    userId,
    googleEmail,
    refreshToken: token.refresh_token,
    accessToken: token.access_token ?? null,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    scope: token.scope ?? null,
  });

  return { googleEmail };
}

// Returns a usable access token, refreshing it first if the stored one is missing or near expiry.
// Null (never a throw) when the dietitian simply hasn't connected — that is a normal state.
async function getAccessToken(userId) {
  const row = await findGoogleToken(userId);
  if (!row) return null;

  const stillValid = row.accessToken && row.accessTokenExpiresAt && new Date(row.accessTokenExpiresAt).getTime() - EXPIRY_SKEW_MS > Date.now();
  if (stillValid) return row.accessToken;

  const token = await postForm(OAUTH_TOKEN_URL, {
    refresh_token: row.refreshToken,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    grant_type: 'refresh_token',
  });

  await updateAccessToken({
    userId,
    accessToken: token.access_token,
    accessTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
  });
  return token.access_token;
}

export async function getConnectionStatus(userId) {
  if (!isGoogleConfigured()) return { configured: false, connected: false, googleEmail: null };
  const row = await findGoogleToken(userId);
  return { configured: true, connected: Boolean(row), googleEmail: row?.googleEmail ?? null };
}

export async function disconnect(userId) {
  await deleteGoogleToken(userId);
}

async function calendarRequest(accessToken, path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${CALENDAR_EVENTS_URL}${path}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  // 204/404 on delete are both "it's gone", which is the outcome the caller wanted.
  if (res.status === 204 || res.status === 404) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Google Calendar ${method} ${path || '/'} failed (${res.status}): ${data?.error?.message || 'unknown error'}`);
  return data;
}

/**
 * Creates a Calendar event on the dietitian's primary calendar with a Meet room attached.
 * Returns { meetingUrl, eventId } — or null when the integration is off, the dietitian hasn't
 * connected, or Google refuses. Never throws: see the file header.
 */
export async function createMeetingForCall({ dietitianId, summary, description, startsAt, endsAt, attendeeEmails = [] }) {
  if (!isGoogleConfigured()) return null;
  try {
    const accessToken = await getAccessToken(dietitianId);
    if (!accessToken) return null;

    const event = await calendarRequest(accessToken, '', {
      method: 'POST',
      // conferenceDataVersion=1 is required, and easy to miss: without it Google silently accepts
      // the request and returns an event with no conferencing attached at all.
      query: { conferenceDataVersion: '1', sendUpdates: 'none' },
      body: {
        summary,
        description,
        start: { dateTime: new Date(startsAt).toISOString() },
        end: { dateTime: new Date(endsAt).toISOString() },
        attendees: attendeeEmails.filter(Boolean).map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            // Google requires a caller-supplied idempotency key; the call id keeps a retry from
            // creating a second room for the same appointment.
            requestId: `nourishly-${summary}-${new Date(startsAt).getTime()}`.slice(0, 64),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const meetingUrl =
      event?.hangoutLink ??
      event?.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ??
      null;
    if (!meetingUrl) return null;
    return { meetingUrl, eventId: event.id };
  } catch (err) {
    console.error('[googleMeet] createMeetingForCall failed', err.message);
    return null;
  }
}

// Moves an existing event. Returns true if Google accepted it; false means the caller should treat
// the stored link as still-valid-but-stale rather than failing the reschedule.
export async function updateMeetingTime({ dietitianId, eventId, startsAt, endsAt }) {
  if (!isGoogleConfigured() || !eventId) return false;
  try {
    const accessToken = await getAccessToken(dietitianId);
    if (!accessToken) return false;
    await calendarRequest(accessToken, `/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      query: { sendUpdates: 'none' },
      body: {
        start: { dateTime: new Date(startsAt).toISOString() },
        end: { dateTime: new Date(endsAt).toISOString() },
      },
    });
    return true;
  } catch (err) {
    console.error('[googleMeet] updateMeetingTime failed', err.message);
    return false;
  }
}

// Removes the event so a cancelled call doesn't leave a live meeting on the dietitian's calendar.
export async function cancelMeeting({ dietitianId, eventId }) {
  if (!isGoogleConfigured() || !eventId) return false;
  try {
    const accessToken = await getAccessToken(dietitianId);
    if (!accessToken) return false;
    await calendarRequest(accessToken, `/${encodeURIComponent(eventId)}`, { method: 'DELETE', query: { sendUpdates: 'none' } });
    return true;
  } catch (err) {
    console.error('[googleMeet] cancelMeeting failed', err.message);
    return false;
  }
}
