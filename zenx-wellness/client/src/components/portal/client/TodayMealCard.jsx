import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TodayMealCard({ meal, whenLabel, onMarkEaten, isPending }) {
  const recipe = meal.recipe;
  const title = recipe?.title ?? meal.customTitle ?? `${meal.mealType} — recipe TBD`;

  return (
    <div className="mt-4 flex items-center gap-4 rounded-card border border-sage bg-cream p-4">
      <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-soft">
        {recipe?.emoji ?? '🍽️'}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-semibold tracking-wide text-brand-strong uppercase">
          {meal.completed ? 'Already logged' : 'Up next'}
          {whenLabel ? ` · ${whenLabel}` : ''} · {meal.time}
        </span>
        <h3 className="truncate text-base font-semibold text-forest">{title}</h3>
        {recipe?.tags?.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{recipe.tags.join(' · ')}</p>
        )}
      </div>
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
  );
}
