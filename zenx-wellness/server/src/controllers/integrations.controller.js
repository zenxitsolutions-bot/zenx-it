import { safeErrorMeta } from '../utils/safeError.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { findUserById } from '../models/User.js';
import { findCompanyById } from '../models/Company.js';
import { hydrateUserPermissions } from '../models/AccessControl.js';
import { hasPermission } from '../../../shared/permissions.js';
import { env } from '../config/env.js';
import { buildAuthUrl, exchangeCodeAndStore, getConnectionStatus, disconnect, isGoogleConfigured } from '../services/googleMeet.js';

// The OAuth `state` is a short-lived JWT rather than an opaque random string kept server-side.
// Two reasons: the callback arrives on a plain browser redirect with no Authorization header, so
// it has to carry its own proof of who started the flow; and signing it means a callback cannot be
// replayed against a different account — the user id inside is the one we attach the grant to,
// never anything the query string claims. 10 minutes is well past a normal consent screen.
const STATE_TTL = '10m';

function signState(userId) {
  return jwt.sign({ sub: userId, purpose: 'google-oauth' }, env.jwtAccessSecret, { expiresIn: STATE_TTL });
}

function verifyState(state) {
  const payload = jwt.verify(state, env.jwtAccessSecret);
  if (payload.purpose !== 'google-oauth') throw new Error('wrong token purpose');
  return payload.sub;
}

export const getGoogleStatus = asyncHandler(async (req, res) => {
  res.json(await getConnectionStatus(req.user.id));
});

export const startGoogleAuth = asyncHandler(async (req, res) => {
  if (!isGoogleConfigured()) {
    throw ApiError.badRequest('Google Calendar is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }
  res.json({ url: buildAuthUrl(signState(req.user.id)) });
});

// Public on purpose: Google redirects the browser here with no Authorization header. Authorisation
// comes from the signed `state` instead (see signState), so this cannot be used to attach a Google
// account to anyone but the user who began the flow.
//
// Always redirects back into the app rather than rendering JSON — this URL is reached by a human
// in a browser, not by fetch.
export const googleCallback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;

  // Resolve the user first so the redirect can go straight to their own tenant path. Falling back
  // to the bare /app/calls would still work (LegacyAppRedirect rewrites it under the user's slug,
  // query string included), but only for a session the browser still has — landing directly on
  // /:companySlug/app/calls avoids depending on that.
  let userId = null;
  try {
    if (state) userId = verifyState(state);
  } catch {
    userId = null;
  }

  const user = userId ? await findUserById(userId) : null;
  const slug = user?.companySlug;
  const basePath = slug ? `/${slug}/app/calls` : '/app/calls';
  const back = (params) => res.redirect(`${env.clientOrigin}${basePath}?${new URLSearchParams(params).toString()}`);

  if (error) return back({ google: 'denied' });
  if (!code || !state) return back({ google: 'error' });
  // state was present but didn't verify — expired, tampered with, or signed for another purpose.
  if (!userId) return back({ google: 'expired' });

  // A still-valid OAuth state must not restore a capability revoked during consent.
  const company = user?.companyId ? await findCompanyById(user.companyId) : null;
  const permitted = user && ['admin', 'dietitian'].includes(user.role)
    && (!user.accountStatus || user.accountStatus === 'active') && !user.mustChangePassword
    && company?.status === 'ACTIVE';
  const currentUser = permitted ? await hydrateUserPermissions(user) : null;
  if (!currentUser || !hasPermission(currentUser, 'calls.view') || !hasPermission(currentUser, 'calls.manage')) {
    return back({ google: 'denied' });
  }

  try {
    await exchangeCodeAndStore(userId, code);
    return back({ google: 'connected' });
  } catch (err) {
    console.error('[integrations] google callback failed', safeErrorMeta(err));
    return back({ google: 'error' });
  }
});

export const disconnectGoogle = asyncHandler(async (req, res) => {
  await disconnect(req.user.id);
  res.status(204).send();
});
