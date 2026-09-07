import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WEEKDAYS } from '@/lib/clientPortal';
import { addCalendarDays, formatCalendarDate, toCalendarDate } from '@/lib/calendarDate';
import { MEAL_SLOT_TYPES } from '@/lib/mealSlotTypes';
import { MEAL_TIME_OPTIONS, normalizeMealTime } from '@/lib/planBuilder';
import { cn } from '@/lib/utils';
import { MealDropzone } from './MealDropzone';

export function ScheduleRow({ meal, recipes, weekStart, highlighted, onChange, onRemove, onNotifySwap, notifyPending, ref }) {
  const recipe = recipes.find((r) => r._id === meal.recipeId) ?? null;
  const isCustom = meal.mealType === 'Custom';
  // Prefer the canonical spelling so a legacy "9:30 pM" lands on the real "9:30 PM" option.
  const timeValue = normalizeMealTime(meal.time) ?? meal.time ?? '';

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border p-2',
        meal.swapRequested ? 'border-calories bg-calories-tint/50' : 'border-line/60',
        highlighted && 'ring-2 ring-coral ring-offset-2'
      )}
    >
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

        {/* A saved time that predates this dropdown (or that normalizeMealTime can't parse) is
            offered as its own first option, so opening an old plan can never silently replace the
            dietitian's time with the nearest listed one. */}
        <Select value={timeValue} onValueChange={(time) => onChange({ time })}>
          <SelectTrigger className="w-full" aria-label="Time">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {!MEAL_TIME_OPTIONS.includes(timeValue) && timeValue ? (
              <SelectItem value={timeValue}>{timeValue}</SelectItem>
            ) : null}
            {MEAL_TIME_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      {meal.swapRequested && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
          <p className="text-xs text-status-followup-ink">
            Client asked to swap this meal. Choose a new recipe, then notify them.
          </p>
          <button
            type="button"
            onClick={onNotifySwap}
            disabled={notifyPending}
            className="rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white hover:bg-coral/90 disabled:opacity-60"
          >
            {notifyPending ? 'Sending…' : 'Notify client of swap'}
          </button>
        </div>
      )}
    </div>
  );
}
