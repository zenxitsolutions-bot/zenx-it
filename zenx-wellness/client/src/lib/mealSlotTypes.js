// The weekly plan builder's Meal type select. 'Custom' is a UI-only sentinel — never itself saved
// as a meal's mealType; picking it reveals a free-text meal-type-name input (and swaps the recipe
// picker for a free-text recipe-name input too) whose values are saved instead. Independent of
// recipe.mealType/RECIPE_CATEGORIES — a recipe's own category has never constrained which plan
// slot it can be dropped into.
export const MEAL_SLOT_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Custom'];

// The 4 fixed slot types, without the 'Custom' sentinel — used to detect whether an existing
// meal's mealType is one of these or a previously-saved custom value.
export const FIXED_MEAL_SLOT_TYPES = MEAL_SLOT_TYPES.filter((t) => t !== 'Custom');
