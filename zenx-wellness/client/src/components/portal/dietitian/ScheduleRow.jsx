import { Pencil, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dateForMealDay, formatCalendarDate, planDayOptions } from '@/lib/calendarDate';
import { MEAL_SLOT_TYPES } from '@/lib/mealSlotTypes';
import { MEAL_TIME_OPTIONS, normalizeMealTime } from '@/lib/planBuilder';
import { mergeRecipeWithOverride } from '@/lib/planMealRecipe';
import { nutritionSummary } from '@/lib/recipeNutrition';
import { cn } from '@/lib/utils';
import { MealDropzone } from './MealDropzone';

export function ScheduleRow({
  meal,
  recipes,
  weekStart,
  weekEnd,
  highlighted,
  onChange,
  onRemove,
  onNotifySwap,
  onEditRecipe,
  notifyPending,
  readOnly = false,
  allowRecipeSwap = false,
  dayLocked = false,
  ref,
}) {
  const catalog = recipes.find((r) => r._id === meal.recipeId) ?? null;
  const recipe = mergeRecipeWithOverride(catalog, meal.recipeOverride) ?? catalog;
  const isCustom = meal.mealType === 'Custom';
  const customized = Boolean(meal.recipeOverride && recipe);
  const swappedRecipe =
    String(meal.recipeId ?? '') !== String(meal.swapOriginalRecipeId ?? '') ||
    (meal.customTitle ?? '') !== (meal.swapOriginalCustomTitle ?? '');
  const recipeReadOnly = readOnly && !allowRecipeSwap;
  const canNotify =
    !recipeReadOnly &&
    Boolean(meal.recipeId || (meal.customTitle ?? '').trim()) &&
    meal.swapRequested &&
    swappedRecipe;
  // Prefer the canonical spelling so a legacy "9:30 pM" lands on the real "9:30 PM" option.
  const timeValue = normalizeMealTime(meal.time) ?? meal.time ?? '';
  const dayOptions = planDayOptions(weekStart, weekEnd);
  if (meal.day && !dayOptions.some((option) => option.value === meal.day)) {
    dayOptions.unshift({ value: meal.day, ymd: dateForMealDay(weekStart, meal.day) || meal.day });
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border p-2',
        meal.swapRequested ? 'border-calories bg-calories-tint/50' : 'border-line/60',
        highlighted && 'ring-2 ring-coral ring-offset-2'
      )}
    >
      <div
        className={cn(
          'grid items-center gap-2',
          dayLocked ? 'grid-cols-[1fr_1fr_1.6fr_72px_28px]' : 'grid-cols-[1fr_1fr_1fr_1.6fr_72px_28px]'
        )}
      >
        {dayLocked ? null : (
          <Select value={meal.day} onValueChange={(day) => onChange({ day })} disabled={readOnly}>
            <SelectTrigger className="w-full" aria-label="Day">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dayOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {formatCalendarDate(option.ymd, { weekday: 'short', month: 'short', day: 'numeric' }) || option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* A saved time that predates this dropdown (or that normalizeMealTime can't parse) is
            offered as its own first option, so opening an old plan can never silently replace the
            dietitian's time with the nearest listed one. */}
        <Select value={timeValue} onValueChange={(time) => onChange({ time })} disabled={readOnly}>
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

        <Select value={meal.mealType} onValueChange={(mealType) => onChange({ mealType })} disabled={readOnly}>
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
            disabled={recipeReadOnly}
          />
        ) : (
          <MealDropzone
            id={`row-${meal.localId}`}
            recipe={recipe}
            recipes={recipes}
            onAssign={(recipeId) => onChange({ recipeId, recipeOverride: null })}
            readOnly={recipeReadOnly}
          />
        )}

        <Input
          aria-label="Servings"
          type="number"
          min="0.5"
          step="0.5"
          value={meal.servings ?? 1}
          onChange={(e) => onChange({ servings: Number(e.target.value) || 1 })}
          disabled={readOnly || isCustom}
          className="h-9 px-2 text-xs"
          title="Servings"
        />

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove meal"
          disabled={readOnly}
          className="grid size-7 place-items-center rounded-lg bg-sage/70 text-coral hover:bg-coral/20 disabled:opacity-30"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {recipe && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-[11px] font-semibold text-forest">
            {nutritionSummary(recipe, meal.servings).join(' · ') || 'Nutrition updates with servings'}
            {customized ? ' · Customized for this client' : ''}
          </p>
          {!recipeReadOnly ? (
            <button
              type="button"
              onClick={onEditRecipe}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-coral hover:underline"
            >
              <Pencil className="size-3" aria-hidden="true" />
              Edit for this client
            </button>
          ) : null}
        </div>
      )}

      {isCustom && (
        <Input
          aria-label="Custom meal type name"
          value={meal.customMealType ?? ''}
          onChange={(e) => onChange({ customMealType: e.target.value })}
          placeholder="Name this meal type (e.g. Pre-workout snack)"
          className="mt-2"
          disabled={readOnly}
        />
      )}

      <Input
        aria-label="Meal notes"
        value={meal.notes ?? ''}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Add a note for this meal (optional) — shown on the client profile"
        className="mt-2 border-none bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
        disabled={readOnly}
      />

      {meal.swapRequested && !recipeReadOnly && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
          <p className="text-xs text-status-followup-ink">
            {!swappedRecipe
              ? 'Client asked to swap this meal. Choose a new recipe, then notify them.'
              : 'Replacement is ready. Notify the client by email and in the app.'}
          </p>
          <button
            type="button"
            onClick={onNotifySwap}
            disabled={notifyPending || !canNotify}
            className="rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white hover:bg-coral/90 disabled:opacity-60"
          >
            {notifyPending ? 'Sending…' : 'Notify client of swap'}
          </button>
        </div>
      )}
    </div>
  );
}
