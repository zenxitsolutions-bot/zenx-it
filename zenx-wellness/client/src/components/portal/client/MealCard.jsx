import { useState } from 'react';
import { Check, ChevronDown, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecipeDetails } from './RecipeDetails';

export function MealCard({ meal, onToggleEaten, onToggleSwap, isPending }) {
  const [open, setOpen] = useState(false);
  const recipe = meal.recipe;
  const title = recipe?.title ?? meal.customTitle ?? `${meal.mealType} — recipe TBD`;
  const hasDetails = Boolean(recipe?.ingredients || recipe?.instructions || recipe?.kcal || recipe?.protein || recipe?.prepTime || meal.notes);

  return (
    <article className="card-hover rounded-card border border-line bg-white p-4 shadow-soft">
      <div className="flex items-center gap-4">
        <span className="hidden w-20 shrink-0 text-xs font-semibold tracking-wide text-brand-strong uppercase min-[520px]:block">
          {meal.mealType}
        </span>
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cream text-xl">
          {recipe?.emoji ?? '🍽️'}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs text-muted-foreground">
            <span className="font-semibold text-brand-strong uppercase min-[520px]:hidden">{meal.mealType} · </span>
            {meal.time}
            {recipe?.prepTime ? ` · ${recipe.prepTime}` : ''}
          </span>
          <h3 className="text-sm font-semibold text-forest">{title}</h3>
          {(recipe?.kcal || recipe?.protein) && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {recipe.kcal ? `${recipe.kcal} kcal` : ''}
              {recipe.kcal && recipe.protein ? ' · ' : ''}
              {recipe.protein ? `${recipe.protein}g protein` : ''}
            </p>
          )}
          {recipe?.tags?.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">{recipe.tags.join(' · ')}</p>
          )}
        </div>

        {hasDetails && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title={open ? 'Hide recipe' : 'View recipe'}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted-foreground transition-colors hover:border-coral hover:bg-sage hover:text-brand-strong"
          >
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            <span className="sr-only">{open ? 'Hide recipe' : 'View recipe'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSwap}
          disabled={isPending}
          aria-pressed={meal.swapRequested}
          title={meal.swapRequested ? 'Swap requested — your dietitian has been notified' : 'Ask for a swap'}
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full border transition-colors',
            meal.swapRequested
              ? 'border-calories bg-calories-tint text-status-followup-ink'
              : 'border-line text-muted-foreground hover:border-coral hover:bg-sage hover:text-brand-strong'
          )}
        >
          <Repeat className="size-4" aria-hidden="true" />
          <span className="sr-only">{meal.swapRequested ? 'Swap requested' : 'Request a swap'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleEaten}
          disabled={isPending}
          aria-pressed={meal.completed}
          title={meal.completed ? 'Marked eaten' : 'Mark eaten'}
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-full border transition-colors',
            meal.completed
              ? 'border-coral bg-coral text-white'
              : 'border-line text-forest hover:border-coral hover:bg-sage hover:text-brand-strong'
          )}
        >
          <Check className="size-4" aria-hidden="true" />
          <span className="sr-only">{meal.completed ? 'Marked eaten' : 'Mark eaten'}</span>
        </button>
      </div>

      {open && <RecipeDetails recipe={recipe} notes={meal.notes} />}
    </article>
  );
}
