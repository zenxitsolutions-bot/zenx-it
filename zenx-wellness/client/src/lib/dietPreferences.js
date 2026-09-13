export const DIET_PREFERENCES = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'non-vegetarian', label: 'Non-vegetarian' },
  { value: 'eggetarian', label: 'Eggetarian' },
  { value: 'no-preference', label: 'No preference' },
];

export function dietPreferenceLabel(value) {
  return DIET_PREFERENCES.find((option) => option.value === value)?.label ?? value ?? '—';
}
