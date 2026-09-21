import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getMyPhotoRequest, getUserPhotoRequest, uploadMyPhotoRequest, removeMyPhotoRequest } from '../api/profilePhoto.api';
import { profilePhotoKey, profileUserId } from '../lib/profilePhoto';

export function useProfilePhoto(userId) {
  const { user } = useAuth();
  const viewerId = profileUserId(user);
  const targetId = userId === undefined ? viewerId : profileUserId(userId);
  const isOwnPhoto = viewerId === targetId;
  const scope = JSON.stringify(profilePhotoKey(viewerId, targetId));
  const query = useQuery({
    queryKey: profilePhotoKey(viewerId, targetId),
    queryFn: ({ signal }) => isOwnPhoto ? getMyPhotoRequest({ signal }) : getUserPhotoRequest(targetId, { signal }),
    enabled: Boolean(viewerId && targetId) && (!isOwnPhoto || ['client', 'dietitian'].includes(user?.role)),
    staleTime: 30 * 1000,
    // Revisit/focus refreshes a counterpart's updated or removed photo, including
    // a previously empty photo. No repeated multi-megabyte background polling.
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    retry: false,
  });
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!query.data) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(query.data);
    setPreview({ blob: query.data, scope, url });
    return () => URL.revokeObjectURL(url);
  }, [query.data, scope]);
  return { ...query, photoUrl: !query.isError && preview?.scope === scope && preview?.blob === query.data ? preview?.url : null };
}

export function useSaveProfilePhoto() {
  const { user } = useAuth();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (file) => file ? uploadMyPhotoRequest(file) : removeMyPhotoRequest(),
    onMutate: () => ({ photoKey: profilePhotoKey(user, user) }),
    onSuccess: async (_, file, context) => {
      const key = context.photoKey;
      // Stop an older in-flight read from replacing a just-saved/removed photo.
      await cache.cancelQueries({ queryKey: key, exact: true });
      cache.setQueryData(key, file ?? null);
      await cache.invalidateQueries({ queryKey: key, exact: true });
    },
  });
}
