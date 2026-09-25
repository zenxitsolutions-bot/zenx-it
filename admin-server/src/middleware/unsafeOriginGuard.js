import { ApiError } from '../utils/ApiError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CORS controls whether a browser may READ a response; it does not prevent a simple form POST
// from reaching a cookie-authenticated endpoint. Reject unsafe browser requests before parsing
// bodies or touching routes. No-Origin non-browser clients remain supported.
export function unsafeOriginGuard(allowedOrigins) {
  const allowed = new Set(allowedOrigins);
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.headers.origin;
    const rejected = origin === undefined
      ? req.headers['sec-fetch-site'] === 'cross-site'
      : typeof origin !== 'string' || origin === 'null' || !allowed.has(origin);
    if (rejected) return next(ApiError.forbidden('Request origin is not allowed'));
    return next();
  };
}

