import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RecipeDragPreview({ recipe, className }) {
  return (
    <div
      className={cn(
        'flex w-[240px] items-start gap-2.5 rounded-xl border border-coral bg-white p-2.5 shadow-lg will-change-transform',
        className
      )}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-peach text-lg">{recipe.emoji}</div>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-xs font-semibold text-forest">{recipe.title}</strong>
        <span className="text-[10px] text-muted-foreground">
          {recipe.mealType}
          {recipe.kcal ? ` · ${recipe.kcal} kcal` : ''}
        </span>
      </div>
      <GripVertical className="size-4 shrink-0 text-sage-deep" aria-hidden="true" />
    </div>
  );
}

// Draggable source in the recipe rail. The card stays in place (faded) while DragOverlay shows
// the held copy — otherwise the rail's overflow clips the moving node and the drag looks empty.
export const RecipeRailCard = memo(function RecipeRailCard({ recipe, dragIdPrefix = 'rail' }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${dragIdPrefix}-${recipe._id}`,
    data: {
      recipeId: recipe._id,
      preview: {
        emoji: recipe.emoji,
        title: recipe.title,
        mealType: recipe.mealType,
        kcal: recipe.kcal,
      },
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex cursor-grab items-start gap-2.5 rounded-xl border border-line bg-white p-2.5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sage-deep active:cursor-grabbing',
        isDragging && 'opacity-30'
      )}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-peach text-lg">{recipe.emoji}</div>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-xs font-semibold text-forest">{recipe.title}</strong>
        <span className="text-[10px] text-muted-foreground">
          {recipe.mealType} · {recipe.cookTime && recipe.cookTime !== 'No cooking' && recipe.cookTime !== '0 min' ? `Cook ${recipe.cookTime}` : recipe.prepTime}
          {recipe.kcal ? ` · ${recipe.kcal} kcal` : ''}
        </span>
      </div>
      <GripVertical className="size-4 shrink-0 text-sage-deep" aria-hidden="true" />
    </div>
  );
});
