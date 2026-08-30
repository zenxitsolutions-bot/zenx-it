import { WEEKDAYS } from './clientPortal';
import { FIXED_MEAL_SLOT_TYPES } from './mealSlotTypes';

// UTC-based deliberately, matching server/src/controllers/insights.controller.js's fix for the
// same bug: local-time Date methods + .toISOString() shift the computed Monday by a day in any
// timezone ahead of UTC (e.g. IST), so this and the server's stored `Plan.week` — which must
// compare equal for the plan builder to find an existing plan — silently disagreed. Found by
// actually loading the plan builder for a client with a seeded plan and seeing an empty schedule.
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)).toISOString().slice(0, 10);
}

// The diet week's end date — always exactly 6 days after its start. Same UTC-safe math as
// startOfWeek, so the two stay consistent regardless of the caller's local timezone.
export function endOfWeek(weekStart) {
  const d = new Date(weekStart);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 6)).toISOString().slice(0, 10);
}

let localId = 0;
export function createBlankMeal(day = WEEKDAYS[0]) {
  return {
    localId: `new-${++localId}`,
    day,
    time: '8:00 AM',
    mealType: 'Breakfast',
    customMealType: '',
    recipeId: null,
    customTitle: '',
    notes: '',
  };
}

// Server meal slot → local editable row (adds a stable localId for React keys/dnd-kit ids since
// the server's subdocuments have no _id of their own). A mealType outside the 4 fixed values is,
// by construction, a previously-saved custom one (same membership-test convention already used for
// a recipe's own free-text category, no separate flag needed) — the Select shows the 'Custom'
// sentinel and the real saved name moves into customMealType, so switching the dropdown away from
// Custom and back restores it exactly instead of losing it.
export function toLocalMeal(meal) {
  const isCustom = !FIXED_MEAL_SLOT_TYPES.includes(meal.mealType);
  return {
    localId: `saved-${++localId}`,
    day: meal.day,
    time: meal.time,
    mealType: isCustom ? 'Custom' : meal.mealType,
    customMealType: isCustom ? meal.mealType : '',
    recipeId: meal.recipe?._id ?? meal.recipe ?? null,
    customTitle: meal.customTitle ?? '',
    notes: meal.notes ?? '',
  };
}

// Local editable row → the shape the API expects. While a slot shows 'Custom', its fixed-type/
// recipeId buffers are simply left out of the payload (still preserved in local state — see
// ScheduleRow — so toggling back to Custom later restores them) rather than cleared; the reverse
// holds for the custom buffers once a fixed type is picked. A blank custom meal-type name falls
// back to the literal "Custom" rather than blocking autosave mid-edit, the same tolerant-of-an-
// incomplete-slot spirit as an empty recipe already rendering as "<type> — recipe TBD" elsewhere.
export function toApiMeal({ mealType, customMealType, day, time, recipeId, customTitle, notes }) {
  const isCustom = mealType === 'Custom';
  return {
    day,
    time,
    mealType: isCustom ? customMealType?.trim() || 'Custom' : mealType,
    recipe: isCustom ? null : recipeId,
    customTitle: isCustom ? customTitle?.trim() || null : null,
    notes: notes || null,
  };
}
