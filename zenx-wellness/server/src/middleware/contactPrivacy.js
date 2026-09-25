import { redactContactDetails } from '../utils/contactPrivacy.js';

// Install before routers; authentication happens inside each router, so resolve
// the current viewer at response time, not when this middleware is entered.
export function contactPrivacy(req, res, next) {
  const json = res.json;
  res.json = function contactSafeJson(body) {
    if (req.user) this.setHeader('Cache-Control', 'private, no-store');
    return json.call(this, redactContactDetails(body, req.user));
  };
  next();
}
