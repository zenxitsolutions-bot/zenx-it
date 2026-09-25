import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

// Two fully independent JWT realms — staff (ZenX employees) and customer (company contacts) —
// separate secrets so a leaked token from one realm can never be replayed as the other, plus a
// `kind` claim as a belt-and-suspenders check even though the secrets already can't cross-verify.

export function signStaffAccessToken(profile, sid) {
  return jwt.sign({ sub: profile.id, role: profile.role, kind: 'staff', type: 'access', sid }, env.adminJwtAccessSecret, {
    expiresIn: env.adminJwtAccessTtl,
  });
}

export function signStaffRefreshToken(profile, sid) {
  return jwt.sign({ sub: profile.id, kind: 'staff', type: 'refresh', sid, jti: randomUUID() }, env.adminJwtRefreshSecret, { expiresIn: env.adminJwtRefreshTtl });
}

export function verifyStaffAccessToken(token) {
  return verify(token, env.adminJwtAccessSecret, 'staff', 'access');
}

export function verifyStaffRefreshToken(token) {
  return verify(token, env.adminJwtRefreshSecret, 'staff', 'refresh');
}

export function signCustomerAccessToken(user, companyId, sid) {
  return jwt.sign(
    { sub: user.id, kind: 'customer', type: 'access', sid, companyId: companyId ?? null },
    env.customerJwtAccessSecret,
    { expiresIn: env.customerJwtAccessTtl },
  );
}

export function signCustomerRefreshToken(user, companyId, sid) {
  return jwt.sign(
    { sub: user.id, kind: 'customer', type: 'refresh', sid, jti: randomUUID(), companyId: companyId ?? null },
    env.customerJwtRefreshSecret,
    { expiresIn: env.customerJwtRefreshTtl },
  );
}

export function verifyCustomerAccessToken(token) {
  return verify(token, env.customerJwtAccessSecret, 'customer', 'access');
}

export function verifyCustomerRefreshToken(token) {
  return verify(token, env.customerJwtRefreshSecret, 'customer', 'refresh');
}

function verify(token, secret, kind, type) {
  const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (payload.kind !== kind || payload.type !== type || typeof payload.sid !== 'string' || !payload.sid || typeof payload.sub !== 'string') {
    throw new Error('Invalid session token');
  }
  return payload;
}
