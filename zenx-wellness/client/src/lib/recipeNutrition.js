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

const QUANTITY_PATTERN = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?`;
const RANGE_SEPARATOR_PATTERN = String.raw`\s*(?:[-–—]|to)\s*`;
const LEADING_QTY = new RegExp(`^(${QUANTITY_PATTERN})(?:(${RANGE_SEPARATOR_PATTERN})(${QUANTITY_PATTERN}))?(\\s*)(.*)$`);
const NON_SCALABLE_LEADING_UNIT = /^(?:-\s*)?(?:inches?|inch|cm|mm|m|met(?:er|re)s?|ft|feet|minutes?|mins?|min|hours?|hrs?|seconds?|secs?)\b/i;
const PARENTHETICAL_CONTENT = /\(([^()]*)\)/g;
const PARENTHETICAL_QTY = new RegExp(
  String.raw`(${QUANTITY_PATTERN})(?:(${RANGE_SEPARATOR_PATTERN})(${QUANTITY_PATTERN}))?(\s*)(g|grams?|kg|kilograms?|mg|ml|l|lit(?:er|re)s?|cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?)\b`,
  'gi'
);
const PARENTHETICAL_COUNT_QTY = new RegExp(
  String.raw`(${QUANTITY_PATTERN})(?:(${RANGE_SEPARATOR_PATTERN})(${QUANTITY_PATTERN}))?(\s+)((?:(?:small|medium|large|mini|whole)\s+)?(?:bananas?|apples?|oranges?|lemons?|limes?|mangoes?|papayas?|guavas?|pears?|kiwis?|peaches?|plums?|figs?|dates?|onions?|tomatoes?|carrots?|potatoes?|cucumbers?|eggs?|cloves?|slices?|pieces?|cubes?|leaves?|almonds?|walnuts?|cashews?|raisins?|chil(?:i|is|ies)|rotis?|phulkas?|idlis?|dosas?|chillas?|chapatis?|theplas?|bhakris?|rotlas?|appams?|adais?|thalipeeths?|muffins?|bay (?:leaf|leaves)|cardamom(?: pods?)?))\b`,
  'gi'
);

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

function scaleQuantityRange(firstAmount, separator, secondAmount, factor) {
  const first = formatLeadingQty(parseLeadingQty(firstAmount) * factor);
  if (!first) return null;
  if (!secondAmount) return first;
  const second = formatLeadingQty(parseLeadingQty(secondAmount) * factor);
  return second ? `${first}${separator}${second}` : null;
}

function scaleParentheticalQuantities(text, factor) {
  return text.replace(PARENTHETICAL_CONTENT, (whole, contents) => {
    let scaledContents = contents.replace(PARENTHETICAL_QTY, (quantity, firstAmount, separator, secondAmount, spacing, unit) => {
      const scaled = scaleQuantityRange(firstAmount, separator, secondAmount, factor);
      return scaled ? `${scaled}${spacing}${unit}` : quantity;
    });

    // Some recipes use a count as a secondary equivalent, e.g. "60 g banana
    // (1/2 banana)". Scale recognised food/count nouns so those equivalents do
    // not become stale when the main amount changes.
    scaledContents = scaledContents.replace(PARENTHETICAL_COUNT_QTY, (quantity, firstAmount, separator, secondAmount, spacing, noun) => {
      const scaled = scaleQuantityRange(firstAmount, separator, secondAmount, factor);
      return scaled ? `${scaled}${spacing}${noun}` : quantity;
    });
    return `(${scaledContents})`;
  });
}

export function scaleIngredientLine(line, factor) {
  const text = String(line ?? '').trim();
  if (!text || factor === 1) return text;
  const match = text.match(LEADING_QTY);
  let scaledLine = text;

  // A recipe can say "1/2-inch ginger" or "10 minutes". Those are physical
  // dimensions/timing instructions, not ingredient amounts to multiply.
  if (match && !NON_SCALABLE_LEADING_UNIT.test(match[5].trim())) {
    const scaled = scaleQuantityRange(match[1], match[2], match[3], factor);
    if (scaled) scaledLine = `${scaled}${match[4]}${match[5]}`;
  }

  // Ingredient lines often include an equivalent measure, e.g. "1 tbsp oil
  // (5 ml)". Keep that equivalence useful when servings change, while only
  // touching recognised quantity equivalents inside parentheses. Physical
  // dimensions and soak/rest timings stay untouched.
  return scaleParentheticalQuantities(scaledLine, factor);
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
