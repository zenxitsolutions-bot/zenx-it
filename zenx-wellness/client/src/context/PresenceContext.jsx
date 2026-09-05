import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PresenceContext = createContext(null);

export function PresenceProvider({ children }) {
  const [onlineUserIds, setOnlineUserIds] = useState(() => new Set());

  const setOnline = useCallback((userId, online) => {
    if (!userId) return;
    setOnlineUserIds((current) => {
      const next = new Set(current);
      if (online) next.add(String(userId));
      else next.delete(String(userId));
      return next;
    });
  }, []);

  const replaceOnline = useCallback((userIds) => {
    setOnlineUserIds(new Set((userIds ?? []).map(String)));
  }, []);

  const isOnline = useCallback((userId) => Boolean(userId) && onlineUserIds.has(String(userId)), [onlineUserIds]);

  const value = useMemo(() => ({ isOnline, setOnline, replaceOnline }), [isOnline, setOnline, replaceOnline]);

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error('usePresence must be used within a PresenceProvider');
  return ctx;
}
