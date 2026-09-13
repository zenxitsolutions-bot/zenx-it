import { memo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const RecipeSlotSelect = memo(function RecipeSlotSelect({ recipe, recipes, onAssign, readOnly }) {
  const [open, setOpen] = useState(false);

  return (
    <Select
      value={recipe?._id ?? ''}
      onValueChange={onAssign}
      disabled={readOnly}
      open={open}
      onOpenChange={setOpen}
    >
      <SelectTrigger
        className={cn(
          'h-auto min-h-[37px] w-full justify-between rounded-lg border px-2.5 py-2 text-left text-xs font-normal transition-colors',
          recipe ? 'border-sage bg-sage/60 text-forest' : 'border-dashed border-line bg-cream text-muted-foreground'
        )}
      >
        {recipe ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span>{recipe.emoji}</span>
            <span className="truncate font-semibold">{recipe.title}</span>
          </span>
        ) : (
          <SelectValue placeholder="Drop a recipe here" />
        )}
      </SelectTrigger>
      {open ? (
        <SelectContent>
          {recipes.map((item) => (
            <SelectItem key={item._id} value={item._id}>
              {item.emoji} {item.title}
            </SelectItem>
          ))}
        </SelectContent>
      ) : null}
    </Select>
  );
});

export function MealDropzone({ id, recipe, recipes, onAssign, readOnly = false }) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled: readOnly });

  return (
    <div
      ref={setNodeRef}
      className={cn('min-w-0 rounded-lg', isOver && 'ring-2 ring-sage-deep ring-offset-1')}
    >
      <RecipeSlotSelect recipe={recipe} recipes={recipes} onAssign={onAssign} readOnly={readOnly} />
    </div>
  );
}
