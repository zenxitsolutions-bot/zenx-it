import { useState } from 'react';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { profileInitial } from '@/lib/profilePhoto';
import { cn } from '@/lib/utils';

// All person avatars use the same authenticated photo path and fallback. Never
// put a bearer token in an image URL or replace a missing peer with the viewer.
export function UserAvatar({ userId = null, name = 'User', className }) {
  const { photoUrl } = useProfilePhoto(userId);
  const [failedUrl, setFailedUrl] = useState(null);
  return photoUrl && failedUrl !== photoUrl ? (
    <img src={photoUrl} alt={`${name}'s profile photo`} onError={() => setFailedUrl(photoUrl)}
      className={cn('size-10 shrink-0 rounded-full object-cover ring-2 ring-sage', className)} />
  ) : (
    <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-full bg-sage text-sm font-semibold text-brand-strong', className)}>
      {profileInitial(name)}
    </span>
  );
}
