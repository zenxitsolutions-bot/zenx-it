import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TodayMealCard({ meal, onMarkEaten, isPending }) {
  const recipe = meal.recipe;
  const title = recipe?.title ?? meal.customTitle ?? `${meal.mealType} — recipe TBD`;

  return (
    <div className="mt-4 flex items-center gap-4 rounded-xl bg-cream p-4">
      <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-2xl">
        {recipe?.emoji ?? '🍽️'}
      </div>
      <div className="flex-1">
        <span className="text-xs font-semibold tracking-wide text-sage-deep uppercase">
          {meal.completed ? 'Already logged' : 'Up next'} · {meal.time}
        </span>
        <h3 className="text-base font-semibold text-forest">{title}</h3>
      </div>
      <button
        type="button"
        onClick={onMarkEaten}
        disabled={meal.completed || isPending}
        aria-label={meal.completed ? `${meal.mealType} already marked complete` : `Mark ${meal.mealType} complete`}
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full border transition-colors',
          meal.completed
            ? 'border-sage-deep bg-sage-deep text-white'
            : 'border-line bg-white text-forest hover:border-sage-deep'
        )}
      >
        <Check className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
