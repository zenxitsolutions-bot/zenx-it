import { findUserById } from '../models/User.js';
import { listTokensForUser, deleteToken } from '../models/DeviceToken.js';
import { canNotifyUser } from './notifyGuard.js';
import { channels } from '../notifications/channels/index.js';

// Best-effort push: never throws to the caller (booking/status changes must not fail because a
// token is stale). Skips inactive/suspended users and deletes tokens the provider rejects.
export async function notifyUserPush(userId, { title, body, url } = {}) {
  try {
    const user = await findUserById(userId);
    if (!canNotifyUser(user)) {
      return { delivered: false, reason: 'user is not notifiable' };
    }

    const tokens = await listTokensForUser(userId);
    if (!tokens.length) {
      return { delivered: false, reason: 'no device tokens registered' };
    }

    let delivered = 0;
    for (const row of tokens) {
      try {
        const result = await channels.push.send({
          to: row.token,
          title,
          body,
          url,
          userId,
        });
        if (result?.invalidToken) await deleteToken(row.token);
        else if (result?.delivered) delivered += 1;
      } catch (err) {
        const message = err.message || String(err);
        if (/expired|invalid|unregistered|notregistered|gone/i.test(message)) {
          await deleteToken(row.token);
          console.warn(`[push] dropped invalid token for user ${userId}:`, message);
        } else {
          console.error(`[push] send failed for user ${userId}:`, message);
        }
      }
    }
    return { delivered: delivered > 0, count: delivered };
  } catch (err) {
    console.error(`[push] notifyUserPush failed for ${userId}:`, err);
    return { delivered: false, reason: err.message };
  }
}
