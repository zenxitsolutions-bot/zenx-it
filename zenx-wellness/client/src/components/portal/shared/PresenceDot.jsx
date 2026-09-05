import { usePresence } from '@/context/PresenceContext';

export function PresenceDot({ userId, showLabel = true }) {
  const { isOnline } = usePresence();
  const online = isOnline(userId);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={`size-2 shrink-0 rounded-full ${online ? 'bg-green-500' : 'bg-muted-foreground/35'}`}
        aria-hidden="true"
      />
      {showLabel && <span className="font-medium text-muted-foreground">{online ? 'Online' : 'Offline'}</span>}
    </span>
  );
}
