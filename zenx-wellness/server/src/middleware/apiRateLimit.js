import rateLimit from 'express-rate-limit';
import { verifyAccessToken } from '../utils/jwt.js';

function readRequestKey(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const token = verifyAccessToken(header.slice(7));
      if (typeof token.sub === 'string' && token.sub) return `user:${token.sub}`;
    } catch {
      // Invalid/expired tokens share the anonymous IP bucket, never an arbitrary
      // client-supplied identity. Route authentication still runs independently.
    }
  }
  return `ip:${req.ip}`;
}

export function createApiRateLimiter({ readLimit = 120, writeLimit = 300, readWindowMs = 60_000, writeWindowMs = 15 * 60_000 } = {}) {
  const reads = rateLimit({
    windowMs: readWindowMs,
    limit: readLimit,
    keyGenerator: readRequestKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many refresh requests. Please wait a minute and try again.' },
  });
  // Preserve the existing IP-based login/write protection. Background polling
  // must not consume this budget or block sign-in, uploads and form submissions.
  const writes = rateLimit({
    windowMs: writeWindowMs,
    limit: writeLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a moment and try again.' },
  });
  return (req, res, next) => {
    if (req.method === 'GET' && req.path === '/api/messages/stream') return next();
    return ['GET', 'HEAD', 'OPTIONS'].includes(req.method)
      ? reads(req, res, next)
      : writes(req, res, next);
  };
}
