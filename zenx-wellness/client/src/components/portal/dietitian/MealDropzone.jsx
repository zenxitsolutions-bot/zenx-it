import { useDroppable } from '@dnd-kit/core';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Two ways to assign a recipe, on the same element: drag a card from the rail (dnd-kit
// draggable/droppable, mouse or keyboard), or pick from the dropdown directly — a full,
// independent keyboard/screen-reader path that doesn't depend on spatial drag navigation at all.
export function MealDropzone({ id, recipe, recipes, onAssign }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="min-w-0">
      <Select value={recipe?._id ?? ''} onValueChange={onAssign}>
        <SelectTrigger
          className={cn(
            'h-auto min-h-[37px] w-full justify-between rounded-lg border px-2.5 py-2 text-left text-xs font-normal transition-colors',
            recipe
              ? 'border-[#b9d3b9] bg-[#edf5e9] text-forest'
              : 'border-dashed border-[#bdd3bd] bg-[#fcfefb] text-[#7c9480]',
            isOver && 'border-sage-deep bg-[#e9f3e7]'
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
        <SelectContent>
          {recipes.map((r) => (
            <SelectItem key={r._id} value={r._id}>
              {r.emoji} {r.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
