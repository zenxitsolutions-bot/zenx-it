import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecipeDetails } from './RecipeDetails';

export function TodayMealCard({ meal, whenLabel, onMarkEaten, isPending }) {
  const [open, setOpen] = useState(false);
  const recipe = meal.recipe;
  const title = recipe?.title ?? meal.customTitle ?? `${meal.mealType} — recipe TBD`;
  const hasDetails = Boolean(recipe?.ingredients || recipe?.instructions || recipe?.kcal || recipe?.protein || recipe?.prepTime || meal.notes);

  return (
    <div className="mt-4 rounded-card border border-sage bg-cream p-4">
      <div className="flex items-center gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-soft">
          {recipe?.emoji ?? '🍽️'}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold tracking-wide text-brand-strong uppercase">
            {meal.completed ? 'Already logged' : 'Up next'}
            {whenLabel ? ` · ${whenLabel}` : ''} · {meal.time}
          </span>
          <h3 className="truncate text-base font-semibold text-forest">{title}</h3>
          {(recipe?.kcal || recipe?.protein || recipe?.prepTime) && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[
                recipe?.kcal ? `${recipe.kcal} kcal` : null,
                recipe?.protein ? `${recipe.protein}g protein` : null,
                recipe?.prepTime || null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {recipe?.tags?.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{recipe.tags.join(' · ')}</p>
          )}
        </div>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title={open ? 'Hide recipe' : 'View recipe'}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-white text-muted-foreground transition-colors hover:border-coral hover:bg-sage hover:text-brand-strong"
          >
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            <span className="sr-only">{open ? 'Hide recipe' : 'View recipe'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onMarkEaten}
          disabled={meal.completed || isPending}
          aria-label={meal.completed ? `${meal.mealType} already marked complete` : `Mark ${meal.mealType} complete`}
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full border transition-all',
            meal.completed
              ? 'border-coral bg-coral text-white'
              : 'border-line bg-white text-forest hover:border-coral hover:bg-sage hover:text-brand-strong'
          )}
        >
          <Check className="size-4.5" aria-hidden="true" />
        </button>
      </div>
      {open && <RecipeDetails recipe={recipe} notes={meal.notes} />}
    </div>
  );
}
