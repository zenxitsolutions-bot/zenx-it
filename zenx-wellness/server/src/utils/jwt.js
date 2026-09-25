import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

export function signAccessToken(user, sid) {
  return jwt.sign(
    { sub: user.id, role: user.role, companyId: user.companyId ?? null, sid, type: 'access' },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessTtl },
  );
}

export function signRefreshToken(user, sid) {
  return jwt.sign({ sub: user.id, tokenVersion: user.refreshTokenVersion, companyId: user.companyId ?? null, sid, type: 'refresh', jti: randomUUID() }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshTtl,
  });
}

export function verifyAccessToken(token) {
  return verify(token, env.jwtAccessSecret, 'access');
}

export function verifyRefreshToken(token) {
  return verify(token, env.jwtRefreshSecret, 'refresh');
}

function verify(token, secret, type) {
  const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (payload.type !== type || typeof payload.sid !== 'string' || !payload.sid || typeof payload.sub !== 'string') {
    throw new Error('Invalid session token');
  }
  return payload;
}
