import { useAuth } from '@/hooks/useAuth';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { cn } from '@/lib/utils';

export function AccountAvatar({ className }) {
  const { user } = useAuth();
  const { photoUrl } = useProfilePhoto();
  return photoUrl ? (
    <img src={photoUrl} alt={`${user.name}'s profile photo`} className={cn('size-10 shrink-0 rounded-full object-cover ring-2 ring-sage', className)} />
  ) : (
    <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-full bg-sage text-sm font-semibold text-brand-strong', className)}>
      {user.name?.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
