import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { axiosClient } from '@/api/axiosClient';

export function RecipeMedia({ recipe, className }) {
  const remote = /^https?:\/\//i.test(recipe?.imageUrl || '');
  const [blobUrl, setBlobUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!recipe?._id || !recipe.imageUrl || remote) {
      setBlobUrl(null);
      return undefined;
    }
    let objectUrl;
    let cancelled = false;
    axiosClient
      .get(`/recipes/${recipe._id}/image`, { responseType: 'blob' })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [recipe?._id, recipe?.imageUrl, remote]);

  const src = remote ? recipe.imageUrl : blobUrl;
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={recipe.title}
        loading="lazy"
        decoding="async"
        className={cn('object-cover', className)}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={cn('grid place-items-center bg-peach text-3xl', className)} aria-hidden="true">
      {recipe?.emoji ?? '🍽️'}
    </div>
  );
}
