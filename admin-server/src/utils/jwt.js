import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Two fully independent JWT realms — staff (ZenX employees) and customer (company contacts) —
// separate secrets so a leaked token from one realm can never be replayed as the other, plus a
// `kind` claim as a belt-and-suspenders check even though the secrets already can't cross-verify.

export function signStaffAccessToken(profile) {
  return jwt.sign({ sub: profile.id, role: profile.role, kind: 'staff' }, env.adminJwtAccessSecret, {
    expiresIn: env.adminJwtAccessTtl,
  });
}

export function signStaffRefreshToken(profile) {
  return jwt.sign({ sub: profile.id, kind: 'staff' }, env.adminJwtRefreshSecret, { expiresIn: env.adminJwtRefreshTtl });
}

export function verifyStaffAccessToken(token) {
  return jwt.verify(token, env.adminJwtAccessSecret);
}

export function verifyStaffRefreshToken(token) {
  return jwt.verify(token, env.adminJwtRefreshSecret);
}

export function signCustomerAccessToken(user, companyId) {
  return jwt.sign(
    { sub: user.id, kind: 'customer', companyId: companyId ?? null },
    env.customerJwtAccessSecret,
    { expiresIn: env.customerJwtAccessTtl },
  );
}

export function signCustomerRefreshToken(user, companyId) {
  return jwt.sign(
    { sub: user.id, kind: 'customer', companyId: companyId ?? null },
    env.customerJwtRefreshSecret,
    { expiresIn: env.customerJwtRefreshTtl },
  );
}

export function verifyCustomerAccessToken(token) {
  return jwt.verify(token, env.customerJwtAccessSecret);
}

export function verifyCustomerRefreshToken(token) {
  return jwt.verify(token, env.customerJwtRefreshSecret);
}
