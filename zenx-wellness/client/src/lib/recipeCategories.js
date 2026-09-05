// The Create/Edit Recipe form's Category select. 'Custom' is a UI-only sentinel — never itself
// saved as a recipe's mealType; picking it reveals a free-text input whose value is saved instead.
export const RECIPE_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Custom'];

// The 4 fixed categories, without the 'Custom' sentinel — used to detect whether an existing
// recipe's mealType is one of these or a previously-saved custom value.
export const FIXED_RECIPE_CATEGORIES = RECIPE_CATEGORIES.filter((c) => c !== 'Custom');
