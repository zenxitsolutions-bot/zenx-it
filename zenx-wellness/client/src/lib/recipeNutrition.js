function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function recipeBaseServings(recipe) {
  const servings = toNumber(recipe?.servings);
  return servings > 0 ? servings : 1;
}

export function servingFactor(recipe, servings) {
  const requested = toNumber(servings);
  if (requested <= 0) return 1;
  return requested / recipeBaseServings(recipe);
}

export function scaleAmount(value, factor) {
  const n = toNumber(value);
  if (!n) return 0;
  return Math.round(n * factor * 10) / 10;
}

export function scaledNutrition(recipe, servings = recipe?.servings ?? 1) {
  const factor = servingFactor(recipe, servings);
  return {
    kcal: scaleAmount(recipe?.kcal, factor),
    protein: scaleAmount(recipe?.protein, factor),
    carbs: scaleAmount(recipe?.carbs, factor),
    fat: scaleAmount(recipe?.fat, factor),
    fiber: scaleAmount(recipe?.fiber, factor),
    sugar: scaleAmount(recipe?.sugar, factor),
  };
}

export function formatMacro(value, unit) {
  if (value == null || value === '' || Number(value) === 0) return null;
  const n = Number(value);
  const shown = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  return `${shown}${unit}`;
}

export function nutritionSummary(recipe, servings) {
  const macros = scaledNutrition(recipe, servings);
  return [
    formatMacro(macros.kcal, ' kcal'),
    formatMacro(macros.protein, 'g protein'),
    formatMacro(macros.carbs, 'g carbs'),
    formatMacro(macros.fat, 'g fat'),
    formatMacro(macros.fiber, 'g fiber'),
  ].filter(Boolean);
}

const LEADING_QTY = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)(\s*)(.*)$/;

function parseLeadingQty(raw) {
  const mixed = String(raw).match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  if (String(raw).includes('/')) {
    const [a, b] = String(raw).split('/');
    return Number(a) / Number(b);
  }
  return Number(raw);
}

function formatLeadingQty(value) {
  if (!Number.isFinite(value) || value <= 0) return null;
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  const tenths = Math.round(rounded * 10) / 10;
  if (Math.abs(tenths - rounded) < 0.001) return String(tenths);
  return String(rounded);
}

export function scaleIngredientLine(line, factor) {
  const text = String(line ?? '').trim();
  if (!text || factor === 1) return text;
  const match = text.match(LEADING_QTY);
  if (!match) return text;
  const scaled = formatLeadingQty(parseLeadingQty(match[1]) * factor);
  if (!scaled) return text;
  return `${scaled}${match[2]}${match[3]}`;
}

export function scaleIngredientText(text, recipe, servings) {
  const factor = servingFactor(recipe, servings);
  const raw = String(text ?? '').trim();
  if (!raw || factor === 1) return raw;
  if (/\r?\n/.test(raw)) {
    return raw
      .split(/\r?\n/)
      .map((line) => scaleIngredientLine(line, factor))
      .join('\n');
  }
  return raw
    .split(',')
    .map((item) => scaleIngredientLine(item.replace(/\.$/, '').trim(), factor))
    .filter(Boolean)
    .join(', ');
}
