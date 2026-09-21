import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { axiosClient } from '@/api/axiosClient';
import { GENERATED_RECIPE_IMAGES } from '@/lib/generatedRecipeImages';

export function RecipeMedia({ recipe, className }) {
  const originalUrl = recipe?.imageUrl || '';
  const catalogPhoto = recipe?.visibility === 'shared' && (
    !originalUrl || originalUrl.startsWith('/images/recipe-catalog/') ||
    /^https:\/\/(images\.unsplash\.com|commons\.wikimedia\.org)\//i.test(originalUrl)
  );
  const imageUrl = catalogPhoto ? GENERATED_RECIPE_IMAGES[recipe.title] || '' : originalUrl;
  const remote = /^https?:\/\//i.test(imageUrl);
  const localCatalogImage = imageUrl.startsWith('/images/recipe-catalog/');
  const [blobUrl, setBlobUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!recipe?._id || !imageUrl || remote || localCatalogImage) {
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
  }, [recipe?._id, imageUrl, remote, localCatalogImage]);

  const src = remote || localCatalogImage ? imageUrl : blobUrl;
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
