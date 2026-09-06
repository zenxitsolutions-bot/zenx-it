import { Check, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MealCard({ meal, onToggleEaten, onToggleSwap, isPending }) {
  const recipe = meal.recipe;
  const title = recipe?.title ?? meal.customTitle ?? `${meal.mealType} — recipe TBD`;

  return (
    <article className="card-hover flex items-center gap-4 rounded-card border border-line bg-white p-4 shadow-soft">
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
        </span>
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
    </article>
  );
}
