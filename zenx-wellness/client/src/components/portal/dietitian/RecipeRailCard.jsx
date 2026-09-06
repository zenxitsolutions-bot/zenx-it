import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// Draggable source in the recipe rail. Fully keyboard-operable via dnd-kit's KeyboardSensor
// (registered on the parent DndContext): Tab to focus, Space/Enter to pick up, arrow keys to
// move, Space/Enter to drop, Escape to cancel.
export function RecipeRailCard({ recipe }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `rail-${recipe._id}`,
    data: { recipe },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'flex cursor-grab items-start gap-2.5 rounded-xl border border-line bg-white p-2.5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sage-deep active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-peach text-lg">{recipe.emoji}</div>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-xs font-semibold text-forest">{recipe.title}</strong>
        <span className="text-[10px] text-muted-foreground">
          {recipe.mealType} · {recipe.prepTime}
        </span>
      </div>
      <GripVertical className="size-4 shrink-0 text-sage-deep" aria-hidden="true" />
    </div>
  );
}
