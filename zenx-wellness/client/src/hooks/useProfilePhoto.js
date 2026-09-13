import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getMyPhotoRequest, uploadMyPhotoRequest, removeMyPhotoRequest } from '../api/profilePhoto.api';

export function useProfilePhoto() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['profile-photo', user?._id],
    queryFn: getMyPhotoRequest,
    enabled: user?.role === 'client' || user?.role === 'dietitian',
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!query.data) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(query.data);
    setPreview({ blob: query.data, url });
    return () => URL.revokeObjectURL(url);
  }, [query.data]);
  return { ...query, photoUrl: preview?.blob === query.data ? preview?.url : null };
}

export function useSaveProfilePhoto() {
  const { user } = useAuth();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (file) => file ? uploadMyPhotoRequest(file) : removeMyPhotoRequest(),
    onSuccess: () => cache.invalidateQueries({ queryKey: ['profile-photo', user?._id] }),
  });
}
