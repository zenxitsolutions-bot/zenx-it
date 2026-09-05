import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WEEKDAYS } from '@/lib/clientPortal';
import { addCalendarDays, formatCalendarDate, toCalendarDate } from '@/lib/calendarDate';
import { MEAL_SLOT_TYPES } from '@/lib/mealSlotTypes';
import { MealDropzone } from './MealDropzone';

export function ScheduleRow({ meal, recipes, weekStart, onChange, onRemove }) {
  const recipe = recipes.find((r) => r._id === meal.recipeId) ?? null;
  const isCustom = meal.mealType === 'Custom';

  return (
    <div className="rounded-xl border border-line/60 p-2">
      <div className="grid grid-cols-[1fr_1fr_1fr_1.6fr_28px] items-center gap-2">
        <Select value={meal.day} onValueChange={(day) => onChange({ day })}>
          <SelectTrigger className="w-full" aria-label="Day">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEKDAYS.map((day, index) => {
              const start = toCalendarDate(weekStart);
              const label = start
                ? formatCalendarDate(addCalendarDays(start, index), { weekday: 'short', month: 'short', day: 'numeric' })
                : day;
              return (
                <SelectItem key={day} value={day}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Input aria-label="Time" value={meal.time} onChange={(e) => onChange({ time: e.target.value })} placeholder="8:00 AM" />

        <Select value={meal.mealType} onValueChange={(mealType) => onChange({ mealType })}>
          <SelectTrigger className="w-full" aria-label="Meal type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEAL_SLOT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isCustom ? (
          <Input
            aria-label="Custom recipe name"
            value={meal.customTitle ?? ''}
            onChange={(e) => onChange({ customTitle: e.target.value })}
            placeholder="Type the recipe/food name"
          />
        ) : (
          <MealDropzone
            id={`row-${meal.localId}`}
            recipe={recipe}
            recipes={recipes}
            onAssign={(recipeId) => onChange({ recipeId })}
          />
        )}

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove meal"
          className="grid size-7 place-items-center rounded-lg bg-sage/70 text-coral hover:bg-coral/20"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {isCustom && (
        <Input
          aria-label="Custom meal type name"
          value={meal.customMealType ?? ''}
          onChange={(e) => onChange({ customMealType: e.target.value })}
          placeholder="Name this meal type (e.g. Pre-workout snack)"
          className="mt-2"
        />
      )}

      <Input
        aria-label="Meal notes"
        value={meal.notes ?? ''}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Add a note for this meal (optional) — shown on the client profile"
        className="mt-2 border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
