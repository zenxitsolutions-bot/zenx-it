import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { recipeCategoryLabel, recipeTimingLabel } from '@/lib/recipeMeta';
import { RecipeMedia } from './RecipeMedia';

export function RecipeCard({ recipe, onClick, onToggleFavorite, favoritePending }) {
  const tags = (recipe.tags ?? []).slice(0, 3);

  return (
    <article className="overflow-hidden rounded-card bg-white text-left shadow-soft transition-shadow hover:shadow-md">
      <button type="button" onClick={onClick} className="block w-full text-left">
        <RecipeMedia recipe={recipe} className="h-36 w-full" />
        <div className="p-4">
          <strong className="block text-forest">{recipe.title}</strong>
          <span className="text-xs text-muted-foreground">
            {recipeCategoryLabel(recipe.mealType)} · {recipeTimingLabel(recipe)}
          </span>
          {recipe.portionSize ? (
            <p className="mt-1 text-xs text-muted-foreground">Portion: {recipe.portionSize}</p>
          ) : null}
          {(recipe.kcal || recipe.protein) && (
            <p className="mt-2 text-xs font-semibold text-forest">
              {recipe.kcal ? `${recipe.kcal} kcal` : ''}
              {recipe.kcal && recipe.protein ? ' · ' : ''}
              {recipe.protein ? `${recipe.protein}g protein` : ''}
              {recipe.servings ? ` · Serves ${recipe.servings}` : ''}
            </p>
          )}
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-sage/40 px-2 py-0.5 text-[10px] font-semibold text-sage-deep">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
      <div className="flex justify-end border-t border-line px-3 py-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite?.(recipe);
          }}
          disabled={favoritePending}
          aria-pressed={recipe.favorited}
          title={recipe.favorited ? 'Remove favourite' : 'Save favourite'}
          className={cn(
            'grid size-8 place-items-center rounded-full',
            recipe.favorited ? 'text-coral' : 'text-muted-foreground hover:text-coral'
          )}
        >
          <Heart className={cn('size-4', recipe.favorited && 'fill-current')} />
          <span className="sr-only">{recipe.favorited ? 'Remove favourite' : 'Save favourite'}</span>
        </button>
      </div>
    </article>
  );
}
