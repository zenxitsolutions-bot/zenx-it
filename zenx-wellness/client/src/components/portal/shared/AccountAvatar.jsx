import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from './UserAvatar';

export function AccountAvatar({ className }) {
  const { user } = useAuth();
  return <UserAvatar userId={user?._id ?? user?.id ?? null} name={user?.name} className={className} />;
}
