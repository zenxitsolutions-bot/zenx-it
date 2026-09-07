import { WEEKDAYS } from './clientPortal';
import { addCalendarDays, toCalendarDate, toLocalCalendarDate } from './calendarDate';
import { FIXED_MEAL_SLOT_TYPES } from './mealSlotTypes';

// The plan week now starts on the day the dietitian is building it, not the Monday of the
// surrounding week — a plan written on a Thursday covers Thu–Wed, which is what "this week's plan"
// means to the person writing it.
//
// Local, not UTC. `week` is a plain calendar date the dietitian picked out of a date input showing
// their own local dates, so deriving it from UTC would show yesterday to anyone east of Greenwich
// late in the evening. (The old Monday-snapping helper was UTC-based for a different reason — it
// had to agree with a server-computed Monday — which no longer applies now that the date is simply
// "today".)
export function defaultWeekStart() {
  return toLocalCalendarDate();
}

// The diet week's end date — always exactly 6 days after its start. Same UTC-safe math as
// startOfWeek, so the two stay consistent regardless of the caller's local timezone.
export function endOfWeek(weekStart) {
  const ymd = toCalendarDate(weekStart);
  return ymd ? addCalendarDays(ymd, 6) : '';
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
    completed: false,
    swapRequested: false,
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
    completed: !!meal.completed,
    swapRequested: !!meal.swapRequested,
    // Frozen at first load of a swap request — autosave must not rewrite these, or "notify"
    // thinks the replacement is the original.
    swapOriginalRecipeId: meal.swapRequested ? (meal.recipe?._id ?? meal.recipe ?? null) : undefined,
    swapOriginalCustomTitle: meal.swapRequested ? (meal.customTitle ?? '') : undefined,
    swapOriginalTitle: meal.swapRequested
      ? (meal.recipe?.title ?? meal.customTitle ?? meal.mealType)
      : undefined,
  };
}

// Local editable row → the shape the API expects. While a slot shows 'Custom', its fixed-type/
// recipeId buffers are simply left out of the payload (still preserved in local state — see
// ScheduleRow — so toggling back to Custom later restores them) rather than cleared; the reverse
// holds for the custom buffers once a fixed type is picked. A blank custom meal-type name falls
// back to the literal "Custom" rather than blocking autosave mid-edit, the same tolerant-of-an-
// incomplete-slot spirit as an empty recipe already rendering as "<type> — recipe TBD" elsewhere.
export function toApiMeal({ mealType, customMealType, day, time, recipeId, customTitle, notes, completed, swapRequested }) {
  const isCustom = mealType === 'Custom';
  return {
    day,
    time,
    mealType: isCustom ? customMealType?.trim() || 'Custom' : mealType,
    recipe: isCustom ? null : recipeId,
    customTitle: isCustom ? customTitle?.trim() || null : null,
    notes: notes || null,
    completed: !!completed,
    swapRequested: !!swapRequested,
  };
}


/* Selectable meal times, replacing what used to be a free-text box. That box let anything through
   and the data shows it — the database currently holds "9:30 pM", which no formatter parses and no
   sort orders correctly. 15-minute steps across 5:00 AM–11:00 PM covers real meal and snack slots
   without turning the list into 96 entries. */
function buildMealTimes() {
  const out = [];
  for (let minutes = 5 * 60; minutes <= 23 * 60; minutes += 15) {
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const suffix = h24 < 12 ? 'AM' : 'PM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    out.push(`${h12}:${String(m).padStart(2, '0')} ${suffix}`);
  }
  return out;
}

export const MEAL_TIME_OPTIONS = buildMealTimes();

/**
 * Canonicalises a stored time to the exact `h:mm AM/PM` spelling used in MEAL_TIME_OPTIONS, so a
 * legacy row still selects its matching option instead of looking like an unknown value. Handles
 * the casing and spacing variants free text produced ("9:30 pM", "9:30pm", "09:30 PM") and 24-hour
 * input ("21:30"). Returns null when it genuinely can't tell — the caller keeps the raw string
 * rather than guessing, so no saved value is ever silently rewritten to something else.
 */
export function normalizeMealTime(value) {
  if (!value) return null;
  const raw = String(value).trim();

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?$/);
  if (ampm) {
    const h = Number(ampm[1]);
    const m = Number(ampm[2]);
    if (h < 1 || h > 12 || m > 59) return null;
    return `${h}:${String(m).padStart(2, '0')} ${ampm[3].toUpperCase()}M`;
  }

  const h24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    const h = Number(h24[1]);
    const m = Number(h24[2]);
    if (h > 23 || m > 59) return null;
    const suffix = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  return null;
}
