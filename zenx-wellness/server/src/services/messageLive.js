// In-process SSE hub for chat + presence. One Node process (this API) is enough: every party
// who can message is on this same server. A future multi-instance deploy would swap this for
// Redis pub/sub without changing the event shapes clients already consume.

const connections = new Map();

export function isUserOnline(userId) {
  return (connections.get(String(userId))?.size ?? 0) > 0;
}

export function onlineUserIdsAmong(userIds) {
  return userIds.map(String).filter(isUserOnline);
}

export function addLiveConnection(userId, res) {
  const key = String(userId);
  if (!connections.has(key)) connections.set(key, new Set());
  connections.get(key).add(res);
}

export function removeLiveConnection(userId, res) {
  const key = String(userId);
  const set = connections.get(key);
  if (!set) return false;
  set.delete(res);
  if (set.size === 0) {
    connections.delete(key);
    return true;
  }
  return false;
}

export function sendLiveEvent(userId, event) {
  const set = connections.get(String(userId));
  if (!set?.size) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) {
    try {
      res.write(payload);
    } catch {
      set.delete(res);
    }
  }
}
