import { Check, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MealCard({ meal, onToggleEaten, onToggleSwap, isPending }) {
  const recipe = meal.recipe;
  const title = recipe?.title ?? meal.customTitle ?? `${meal.mealType} — recipe TBD`;

  return (
    <article className="flex items-center gap-4 rounded-card bg-white p-4 shadow-soft">
      <span className="w-20 shrink-0 text-xs font-semibold tracking-wide text-sage-deep uppercase">
        {meal.mealType}
      </span>
      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-cream text-xl">
        {recipe?.emoji ?? '🍽️'}
      </div>
      <div className="flex-1">
        <span className="text-xs text-muted-foreground">{meal.time}</span>
        <h3 className="text-sm font-semibold text-forest">{title}</h3>
        {recipe?.tags?.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">{recipe.tags.join(' · ')}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleSwap}
        disabled={isPending}
        aria-pressed={meal.swapRequested}
        title={meal.swapRequested ? 'Swap requested — your dietitian has been notified' : 'Ask for a swap'}
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full border transition-colors',
          meal.swapRequested ? 'border-coral bg-coral/10 text-coral' : 'border-line text-muted-foreground hover:border-coral hover:text-coral'
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
          meal.completed ? 'border-sage-deep bg-sage-deep text-white' : 'border-line text-forest hover:border-sage-deep'
        )}
      >
        <Check className="size-4" aria-hidden="true" />
        <span className="sr-only">{meal.completed ? 'Marked eaten' : 'Mark eaten'}</span>
      </button>
    </article>
  );
}
