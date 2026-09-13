import { CATALOG_DETAILS, catalogImageFor } from './healthyIndianRecipeContent.js';
import { buildExpandedHealthyIndianRecipes } from './healthyIndianRecipeExpand.js';

function imageFor(mealType, title) {
  return catalogImageFor(title, mealType);
}

function numberedSteps(steps) {
  return String(steps)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
    .map((line, index) => `${index + 1}. ${line}`)
    .join('\n');
}

function validatedTags(tags, { kcal, protein, carbs, fat, fiber, sugar }) {
  return [...new Set(tags)].filter((tag) => {
    if (tag === 'Low Calorie') return kcal <= 250;
    if (tag === 'High Protein') return protein >= 15;
    if (tag === 'Low Carb') return carbs <= 30;
    if (tag === 'High Fiber') return fiber >= 5;
    if (tag === 'Diabetic Friendly') return sugar <= 12 && carbs <= 60;
    if (tag === 'Heart Healthy') return fat <= 15;
    return true;
  });
}

function detectedAllergens(declared, ingredientText, title = '') {
  const labels = new Set(
    String(declared || '')
      .split(',')
      .map((label) => label.trim())
      .filter((label) => label && label !== 'None')
  );
  const text = String(ingredientText)
    .replace(/\b(?:almond|coconut|oat|soy|soya)\s+milk\b/gi, 'plant beverage')
    .replace(/\bpeanut butter\b/gi, 'peanut spread');
  if (/\b(?:milk|yogurt|curd|paneer|cheese|ghee|whey|raita|kadhi|malai)\b/i.test(text)) {
    labels.add('Dairy');
  }
  if (/\beggs?\b/i.test(text)) labels.add('Eggs');
  if (/\bfish\b/i.test(text)) labels.add('Fish');
  if (/\b(?:prawn|shrimp|crab|lobster)\b/i.test(text)) labels.add('Shellfish');
  if (/\b(?:soy|soya|tofu)\b/i.test(text)) labels.add('Soy');
  if (/\b(?:peanut|almond|walnut|cashew|pistachio)\w*\b/i.test(text)) labels.add('Nuts');
  if (
    /\b(?:wheat|bread|toast|roti|phulka|paratha|semolina|barley)\b/i.test(text) ||
    /\brava idli\b/i.test(title)
  ) {
    labels.add('Gluten');
  }
  return labels.size ? [...labels].join(', ') : 'None';
}

function recipe({
  title,
  emoji,
  mealType,
  dietType = 'Vegetarian',
  prep,
  cook = 0,
  kcal,
  protein,
  carbs,
  fat,
  fiber,
  sugar,
  tags,
  allergens = 'None',
  portion = '1 serving',
  ings,
  steps,
  notes = null,
}) {
  const extra = CATALOG_DETAILS[title] ?? {};
  const suitable =
    mealType === 'Smoothies' ? 'Breakfast' : mealType === 'Biryani' ? 'Lunch' : mealType;
  const ingredientText = (extra.ings || ings).trim();
  const resolvedAllergens = detectedAllergens(allergens, ingredientText, title);
  const resolvedTags = validatedTags(tags, { kcal, protein, carbs, fat, fiber, sugar }).filter(
    (tag) => tag !== 'Gluten Free' || !resolvedAllergens.includes('Gluten')
  );
  return {
    title,
    emoji,
    mealType,
    cuisine: 'Indian',
    dietType,
    prepTime: `${prep} min`,
    cookTime: cook > 0 ? `${cook} min` : 'No cooking',
    totalTime: `${prep + cook} min`,
    servings: 1,
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    portionSize: extra.portion || portion,
    allergens: resolvedAllergens,
    suitableMealType: suitable,
    tags: resolvedTags,
    ingredients: ingredientText,
    instructions: numberedSteps(extra.steps || steps),
    healthNotes: notes,
    imageUrl: imageFor(mealType, title),
  };
}

const WL = 'Weight Loss';
const WG = 'Weight Gain';
const HP = 'High Protein';
const LC = 'Low Carb';
const DF = 'Diabetic Friendly';
const HH = 'Heart Healthy';
const HF = 'High Fiber';
const VG = 'Vegetarian';
const VN = 'Vegan';
const GF = 'Gluten Free';
const LO = 'Low Calorie';
const KD = 'Kids Friendly';

const CORE_HEALTHY_INDIAN_RECIPES = [
  recipe({
    title: 'Banana Oats Smoothie',
    emoji: '🍌',
    mealType: 'Smoothies',
    prep: 5,
    kcal: 280,
    protein: 12,
    carbs: 44,
    fat: 6,
    fiber: 6,
    sugar: 18,
    tags: [WL, VG, HF, KD],
    allergens: 'Dairy, Gluten',
    portion: '1 glass (300 ml)',
    ings: `1 ripe banana
40 g rolled oats
200 ml low-fat milk
1 tsp chia seeds
3 almonds
Ice as needed`,
    steps: `Soak oats in milk for 2 minutes.
Blend banana, oats, milk, chia and almonds until smooth.
Serve immediately.`,
  }),
  recipe({
    title: 'Mango Yogurt Smoothie',
    emoji: '🥭',
    mealType: 'Smoothies',
    prep: 5,
    kcal: 240,
    protein: 11,
    carbs: 38,
    fat: 5,
    fiber: 3,
    sugar: 28,
    tags: [VG, HP, KD],
    allergens: 'Dairy',
    portion: '1 glass (300 ml)',
    ings: `1 cup ripe mango cubes
150 g unsweetened yogurt
50 ml water
4 mint leaves
1 tsp flaxseed`,
    steps: `Blend mango, yogurt, water, mint and flaxseed.
Pour chilled. Skip extra sugar — mango is sweet enough.`,
  }),
  recipe({
    title: 'Berry Smoothie',
    emoji: '🫐',
    mealType: 'Smoothies',
    prep: 5,
    kcal: 190,
    protein: 8,
    carbs: 28,
    fat: 4,
    fiber: 7,
    sugar: 16,
    tags: [WL, LO, HH, VG, DF, HF],
    allergens: 'Dairy',
    portion: '1 glass (300 ml)',
    ings: `1 cup mixed berries
100 g hung curd
100 ml water
1 tsp chia seeds
Stevia optional`,
    steps: `Blend berries, curd, water and chia.
Serve cold. Berries keep sugar lower than mango.`,
  }),
  recipe({
    title: 'Green Detox Smoothie',
    emoji: '🥬',
    mealType: 'Smoothies',
    dietType: 'Vegan',
    prep: 8,
    kcal: 160,
    protein: 5,
    carbs: 26,
    fat: 4,
    fiber: 6,
    sugar: 12,
    tags: [WL, LO, VN, HH, HF, GF],
    portion: '1 glass (300 ml)',
    ings: `1 cup spinach
1/2 cucumber
1 green apple
1/2 lemon juice
1 tsp soaked chia
150 ml coconut water`,
    steps: `Blend spinach, cucumber, apple, lemon, chia and coconut water.
Drink fresh — do not store overnight.`,
  }),
  recipe({
    title: 'Spinach Banana Smoothie',
    emoji: '🥤',
    mealType: 'Smoothies',
    dietType: 'Vegan',
    prep: 5,
    kcal: 210,
    protein: 6,
    carbs: 36,
    fat: 5,
    fiber: 6,
    sugar: 16,
    tags: [WL, VN, HF, GF, KD],
    portion: '1 glass (300 ml)',
    ings: `1 cup spinach
1 banana
150 ml unsweetened almond milk
1 tsp peanut butter
Ice cubes`,
    steps: `Blend spinach, banana, almond milk and peanut butter.
The banana masks spinach flavour for kids.`,
  }),
  recipe({
    title: 'Peanut Butter Banana Smoothie',
    emoji: '🥜',
    mealType: 'Smoothies',
    prep: 5,
    kcal: 360,
    protein: 16,
    carbs: 38,
    fat: 16,
    fiber: 5,
    sugar: 18,
    tags: [WG, HP, VG, KD],
    allergens: 'Peanuts, Dairy',
    portion: '1 glass (350 ml)',
    ings: `1 banana
1 tbsp natural peanut butter
200 ml toned milk
1 tsp oats
Pinch cinnamon`,
    steps: `Blend all ingredients until creamy.
Use natural peanut butter with no added sugar.`,
  }),
  recipe({
    title: 'Protein Smoothie',
    emoji: '💪',
    mealType: 'Smoothies',
    prep: 5,
    kcal: 310,
    protein: 28,
    carbs: 22,
    fat: 10,
    fiber: 4,
    sugar: 10,
    tags: [WG, HP, VG, WL],
    allergens: 'Dairy',
    portion: '1 glass (350 ml)',
    ings: `1 scoop unsweetened whey or plant protein
150 g hung curd
1/2 banana
1 tsp flaxseed
100 ml water`,
    steps: `Blend protein, curd, banana, flaxseed and water.
Skip flavoured powders with sugar.`,
  }),
  recipe({
    title: 'Dates and Almond Smoothie',
    emoji: '🌰',
    mealType: 'Smoothies',
    dietType: 'Vegan',
    prep: 8,
    kcal: 330,
    protein: 8,
    carbs: 42,
    fat: 14,
    fiber: 6,
    sugar: 28,
    tags: [WG, VN, HF, GF],
    allergens: 'Tree nuts',
    portion: '1 glass (300 ml)',
    ings: `4 soaked dates
8 almonds
1 banana
200 ml unsweetened almond milk
Pinch cardamom`,
    steps: `Blend soaked dates, almonds, banana, milk and cardamom.
A natural-sweet breakfast smoothie — keep to one glass.`,
  }),
  recipe({
    title: 'Buttermilk',
    emoji: '🥛',
    mealType: 'Smoothies',
    prep: 5,
    kcal: 70,
    protein: 4,
    carbs: 6,
    fat: 2,
    fiber: 0,
    sugar: 5,
    tags: [WL, LO, DF, HH, VG, GF, KD],
    allergens: 'Dairy',
    portion: '1 glass (250 ml)',
    ings: `150 g fresh curd
100 ml water
1/4 tsp roasted cumin
Pinch salt
Coriander leaves`,
    steps: `Whisk curd with water until frothy.
Season with cumin, salt and coriander. Serve cold.`,
  }),
  recipe({
    title: 'Masala Chaas',
    emoji: '🌿',
    mealType: 'Smoothies',
    prep: 6,
    kcal: 85,
    protein: 5,
    carbs: 7,
    fat: 3,
    fiber: 1,
    sugar: 5,
    tags: [WL, LO, DF, HH, VG, GF],
    allergens: 'Dairy',
    portion: '1 glass (250 ml)',
    ings: `150 g curd
120 ml water
1/2 tsp grated ginger
1/4 tsp roasted cumin
Pinch black salt
Mint leaves`,
    steps: `Blend curd, water, ginger, cumin, black salt and mint.
Digestive drink with meals.`,
  }),
  recipe({
    title: 'Coconut Water Drinks',
    emoji: '🥥',
    mealType: 'Smoothies',
    dietType: 'Vegan',
    prep: 4,
    kcal: 90,
    protein: 2,
    carbs: 18,
    fat: 1,
    fiber: 2,
    sugar: 12,
    tags: [WL, LO, VN, GF, HH, KD],
    portion: '1 glass (250 ml)',
    ings: `250 ml tender coconut water
4 mint leaves
1 tsp lemon juice
Pinch black salt`,
    steps: `Stir coconut water with mint, lemon and black salt.
No added sugar. Best within a few hours of opening.`,
  }),
  recipe({
    title: 'Healthy Lassi',
    emoji: '🍶',
    mealType: 'Smoothies',
    prep: 6,
    kcal: 180,
    protein: 10,
    carbs: 20,
    fat: 6,
    fiber: 1,
    sugar: 14,
    tags: [VG, HP, KD, GF],
    allergens: 'Dairy',
    portion: '1 glass (250 ml)',
    ings: `200 g unsweetened yogurt
50 ml water
1/4 tsp cardamom
3 soaked almonds
Stevia or 1 date if needed`,
    steps: `Blend yogurt, water, cardamom and almonds.
Skip sweetened rose syrups.`,
  }),
  recipe({
    title: 'Vegetable Upma',
    emoji: '🍲',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 10,
    cook: 15,
    kcal: 260,
    protein: 7,
    carbs: 42,
    fat: 7,
    fiber: 5,
    sugar: 4,
    tags: [WL, VN, HF, DF, KD],
    allergens: 'Gluten',
    portion: '1 bowl (250 g)',
    ings: `40 g rava (sooji)
1 tsp cold-pressed oil
1/4 cup mixed vegetables
1/2 tsp mustard seeds
4 curry leaves
1 green chilli
300 ml water
Salt to taste`,
    steps: `Dry-roast rava until fragrant.
Temper mustard, curry leaves and chilli in 1 tsp oil. Add vegetables.
Add water and salt, stir in rava, cover 3 minutes. Fluff and serve.`,
  }),
  recipe({
    title: 'Oats Upma',
    emoji: '🌾',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 8,
    cook: 12,
    kcal: 260,
    protein: 8,
    carbs: 38,
    fat: 8,
    fiber: 6,
    sugar: 3,
    tags: [WL, VN, HF, DF, HH],
    allergens: 'Gluten',
    portion: '1 bowl (250 g)',
    ings: `40 g rolled oats
1 tsp oil
1/4 cup mixed vegetables
1/2 tsp mustard seeds
1/4 tsp turmeric
250 ml water`,
    steps: `Temper mustard in oil, sauté vegetables.
Add oats, turmeric and water. Cook until the oats absorb the liquid.`,
  }),
  recipe({
    title: 'Poha',
    emoji: '🍋',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 10,
    cook: 10,
    kcal: 230,
    protein: 5,
    carbs: 38,
    fat: 6,
    fiber: 3,
    sugar: 3,
    tags: [WL, VN, LO, KD, GF],
    portion: '1 plate (200 g)',
    ings: `50 g thick poha
1 tsp oil
1/4 cup onion and peas
1/2 tsp mustard seeds
Turmeric, salt, lemon`,
    steps: `Rinse poha and drain.
Temper mustard, sauté onion and peas, add turmeric and poha.
Finish with lemon. Keep oil to 1 teaspoon.`,
  }),
  recipe({
    title: 'Vegetable Poha',
    emoji: '🥕',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 12,
    cook: 12,
    kcal: 250,
    protein: 6,
    carbs: 40,
    fat: 7,
    fiber: 5,
    sugar: 4,
    tags: [WL, VN, HF, DF, KD, GF],
    portion: '1 plate (220 g)',
    ings: `50 g thick poha
1/4 cup carrot, beans, peas
1 tsp oil
Mustard seeds, turmeric, lemon
1 tbsp roasted peanuts optional`,
    steps: `Rinse poha. Temper spices, sauté vegetables until just tender.
Fold in poha and lemon. Peanuts optional for crunch.`,
  }),
  recipe({
    title: 'Idli',
    emoji: '⚪',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 15,
    cook: 12,
    kcal: 180,
    protein: 6,
    carbs: 36,
    fat: 1,
    fiber: 2,
    sugar: 1,
    tags: [WL, LO, VN, DF, HH, KD, GF],
    portion: '3 idlis',
    ings: `120 g fermented idli batter
Oil spray for moulds
Coconut chutney 1 tbsp`,
    steps: `Pour batter into lightly oiled moulds.
Steam 10–12 minutes. Serve with 1 tbsp chutney, not a ladle of oil.`,
  }),
  recipe({
    title: 'Ragi Idli',
    emoji: '🟤',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 15,
    cook: 12,
    kcal: 200,
    protein: 7,
    carbs: 38,
    fat: 2,
    fiber: 4,
    sugar: 1,
    tags: [WL, VN, HF, DF, HH, GF],
    portion: '3 idlis',
    ings: `80 g ragi flour
40 g rice idli batter or urad batter
Salt
Oil spray`,
    steps: `Mix ragi into fermented batter, rest 20 minutes.
Steam 12 minutes. High-fibre millet breakfast.`,
  }),
  recipe({
    title: 'Vegetable Dosa',
    emoji: '🥞',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 10,
    cook: 12,
    kcal: 220,
    protein: 6,
    carbs: 38,
    fat: 5,
    fiber: 4,
    sugar: 3,
    tags: [WL, VN, DF, HF, GF],
    portion: '1 dosa',
    ings: `80 g dosa batter
1/4 cup finely chopped vegetables
1 tsp oil
Salt, cumin`,
    steps: `Spread batter thin on a hot tawa.
Scatter vegetables, drizzle 1 tsp oil around the edge, fold.`,
  }),
  recipe({
    title: 'Ragi Dosa',
    emoji: '🫓',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 8,
    cook: 10,
    kcal: 210,
    protein: 6,
    carbs: 36,
    fat: 5,
    fiber: 5,
    sugar: 2,
    tags: [WL, VN, HF, DF, GF],
    portion: '1 dosa',
    ings: `40 g ragi flour
20 g rice flour
150 ml water
1 tsp oil
Cumin, salt, chopped onion`,
    steps: `Mix a pourable batter. Cook on a non-stick tawa with 1 tsp oil.
Onion optional. Pair with sambar, not coconut oil chutney.`,
  }),
  recipe({
    title: 'Oats Dosa',
    emoji: '🍥',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 10,
    cook: 12,
    kcal: 250,
    protein: 9,
    carbs: 38,
    fat: 6,
    fiber: 4,
    sugar: 2,
    tags: [WL, VN, HF, DF, HH],
    allergens: 'Gluten',
    portion: '1 dosa',
    ings: `40 g oats flour
1 tbsp rice flour
150 ml water
1 tsp oil
Green chilli, cumin`,
    steps: `Blend oats to flour if needed. Mix batter, rest 10 minutes.
Spread on tawa with 1 tsp oil.`,
  }),
  recipe({
    title: 'Moong Dal Chilla',
    emoji: '🟢',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 15,
    cook: 12,
    kcal: 270,
    protein: 16,
    carbs: 30,
    fat: 7,
    fiber: 6,
    sugar: 3,
    tags: [WL, HP, VN, DF, HF, GF],
    portion: '2 chillas',
    ings: `50 g soaked moong dal
1/4 cup onion, tomato, spinach
1 tsp oil
Cumin, salt, ginger`,
    steps: `Grind soaked dal with ginger and cumin.
Mix vegetables, cook two thin chillas using 1 tsp oil total.`,
  }),
  recipe({
    title: 'Besan Chilla',
    emoji: '🟡',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 10,
    cook: 10,
    kcal: 255,
    protein: 13,
    carbs: 28,
    fat: 8,
    fiber: 5,
    sugar: 4,
    tags: [WL, HP, VN, DF, GF],
    portion: '2 chillas',
    ings: `40 g besan
1/4 cup mixed vegetables
1 tsp oil
Ajwain, turmeric, salt
Water to batter`,
    steps: `Whisk besan with spices and water.
Fold in vegetables. Cook two pancakes with 1 tsp oil.`,
  }),
  recipe({
    title: 'Vegetable Uttapam',
    emoji: '🍕',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 10,
    cook: 12,
    kcal: 250,
    protein: 7,
    carbs: 40,
    fat: 6,
    fiber: 4,
    sugar: 4,
    tags: [WL, VN, HF, KD, GF],
    portion: '1 uttapam',
    ings: `80 g dosa batter
1/4 cup onion, tomato, capsicum
1 tsp oil
Coriander`,
    steps: `Pour a thick dosa, top with vegetables.
Cook covered on both sides with 1 tsp oil.`,
  }),
  recipe({
    title: 'Healthy Paratha',
    emoji: '🫓',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 15,
    cook: 25,
    kcal: 400,
    protein: 16,
    carbs: 62,
    fat: 9,
    fiber: 6,
    sugar: 3,
    tags: [WL, VN, HF, DF],
    allergens: 'Gluten',
    portion: '1 paratha',
    ings: `40 g whole-wheat flour
2 tbsp grated vegetables (carrot, methi)
1 tsp oil
Ajwain, salt`,
    steps: `Knead flour with vegetables and water.
Roll and cook on tawa, brushing 1 tsp oil. Skip ghee layers.`,
  }),
  recipe({
    title: 'Paneer Paratha',
    emoji: '🧀',
    mealType: 'Breakfast',
    prep: 15,
    cook: 12,
    kcal: 340,
    protein: 16,
    carbs: 36,
    fat: 14,
    fiber: 5,
    sugar: 3,
    tags: [WG, HP, VG],
    allergens: 'Dairy, Gluten',
    portion: '1 paratha',
    ings: `40 g whole-wheat flour
50 g crumbled low-fat paneer
Spices: chilli, cumin, salt
1 tsp oil`,
    steps: `Stuff spiced paneer into the dough.
Cook with 1 tsp oil. Pair with raita, not butter.`,
  }),
  recipe({
    title: 'Methi Paratha',
    emoji: '🌿',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 15,
    cook: 12,
    kcal: 255,
    protein: 8,
    carbs: 40,
    fat: 7,
    fiber: 7,
    sugar: 2,
    tags: [WL, VN, HF, DF],
    allergens: 'Gluten',
    portion: '1 paratha',
    ings: `40 g whole-wheat flour
1/2 cup chopped methi
1 tsp oil
Ajwain, salt`,
    steps: `Knead methi into the dough.
Roll thin and cook with 1 tsp oil.`,
  }),
  recipe({
    title: 'Oats Porridge',
    emoji: '🥣',
    mealType: 'Breakfast',
    prep: 5,
    cook: 8,
    kcal: 280,
    protein: 12,
    carbs: 40,
    fat: 7,
    fiber: 6,
    sugar: 10,
    tags: [WL, VG, HF, DF, HH, KD],
    allergens: 'Dairy, Gluten',
    portion: '1 bowl',
    ings: `40 g rolled oats
200 ml low-fat milk
1/2 banana or 4 berries
1 tsp flaxseed`,
    steps: `Simmer oats in milk 6–8 minutes.
Top with fruit and flax. No sugar if using banana.`,
  }),
  recipe({
    title: 'Millet Porridge',
    emoji: '🌾',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 5,
    cook: 15,
    kcal: 250,
    protein: 8,
    carbs: 42,
    fat: 5,
    fiber: 5,
    sugar: 4,
    tags: [WL, VN, HF, DF, GF],
    portion: '1 bowl',
    ings: `40 g foxtail or little millet
250 ml water
Pinch salt or cardamom
1 tsp chopped nuts`,
    steps: `Rinse millet, simmer until creamy.
Season lightly. Nuts are the garnish, not a handful.`,
  }),
  recipe({
    title: 'Vegetable Sandwich',
    emoji: '🥪',
    mealType: 'Breakfast',
    dietType: 'Vegan',
    prep: 10,
    cook: 5,
    kcal: 260,
    protein: 8,
    carbs: 38,
    fat: 7,
    fiber: 6,
    sugar: 5,
    tags: [WL, VN, HF, KD],
    allergens: 'Gluten',
    portion: '1 sandwich',
    ings: `2 slices whole-wheat bread
Cucumber, tomato, onion, lettuce
1 tsp mint-coriander chutney
1 tsp hung-curd spread optional`,
    steps: `Toast bread lightly.
Layer vegetables and 1 tsp chutney. Skip butter and cheese slices.`,
  }),
  recipe({
    title: 'Egg Bhurji',
    emoji: '🍳',
    mealType: 'Breakfast',
    dietType: 'Eggetarian',
    prep: 10,
    cook: 18,
    kcal: 430,
    protein: 24,
    carbs: 44,
    fat: 17,
    fiber: 6,
    sugar: 4,
    tags: [WL, HP, DF],
    allergens: 'Egg, Gluten',
    portion: '2 eggs',
    ings: `2 eggs
1 tsp oil
2 tbsp onion, tomato, capsicum
Turmeric, chilli, coriander`,
    steps: `Sauté vegetables in 1 tsp oil.
Scramble eggs in. Do not add extra oil or cream.`,
  }),
  recipe({
    title: 'Boiled Eggs with Vegetables',
    emoji: '🥚',
    mealType: 'Breakfast',
    dietType: 'Eggetarian',
    prep: 5,
    cook: 10,
    kcal: 220,
    protein: 14,
    carbs: 8,
    fat: 14,
    fiber: 3,
    sugar: 3,
    tags: [WL, HP, LC, GF, LO],
    allergens: 'Egg',
    portion: '2 eggs + salad',
    ings: `2 boiled eggs
1 cup cucumber, tomato, greens
Lemon, black pepper, salt`,
    steps: `Boil eggs 9–10 minutes, cool and peel.
Serve with a lemon-dressed vegetable salad. Skip mayo.`,
  }),
  recipe({
    title: 'Brown Rice with Dal',
    emoji: '🍚',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 10,
    cook: 30,
    kcal: 420,
    protein: 16,
    carbs: 68,
    fat: 6,
    fiber: 9,
    sugar: 3,
    tags: [WL, VN, HF, DF, HH, GF],
    portion: '1 plate (rice 150 g cooked + dal 150 g)',
    ings: `50 g brown rice (dry)
40 g toor or moong dal
1 tsp oil
Turmeric, cumin, garlic, tomato
Salt`,
    steps: `Cook brown rice separately.
Temper dal with 1 tsp oil, garlic and tomato. Serve measured portions.`,
  }),
  recipe({
    title: 'Vegetable Khichdi',
    emoji: '🫕',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 10,
    cook: 25,
    kcal: 380,
    protein: 14,
    carbs: 58,
    fat: 8,
    fiber: 8,
    sugar: 4,
    tags: [WL, VN, HF, DF, KD, GF],
    portion: '1 bowl (300 g)',
    ings: `30 g rice
30 g moong dal
1/2 cup mixed vegetables
1 tsp ghee or oil
Turmeric, cumin, ginger`,
    steps: `Pressure-cook rice, dal and vegetables with spices.
Finish with 1 tsp ghee. Keep the tadka light.`,
  }),
  recipe({
    title: 'Moong Dal Khichdi',
    emoji: '🍲',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 8,
    cook: 20,
    kcal: 360,
    protein: 16,
    carbs: 54,
    fat: 6,
    fiber: 8,
    sugar: 3,
    tags: [WL, HP, VN, DF, HF, GF],
    portion: '1 bowl (300 g)',
    ings: `50 g yellow moong dal
20 g rice
1 tsp oil
Turmeric, cumin, ginger
Spinach handful optional`,
    steps: `Wash dal and rice. Cook with turmeric and water until soft.
Temper cumin in 1 tsp oil. Easy to digest.`,
  }),
  recipe({
    title: 'Rajma Rice',
    emoji: '🫘',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 15,
    cook: 35,
    kcal: 450,
    protein: 16,
    carbs: 72,
    fat: 8,
    fiber: 12,
    sugar: 5,
    tags: [WG, VN, HF, HP, GF],
    portion: '1 plate',
    ings: `80 g cooked rajma
50 g brown rice (dry)
1 tsp oil
Onion, tomato, garlic, spices
Coriander`,
    steps: `Simmer soaked rajma until tender.
Make a tomato gravy with 1 tsp oil. Serve with measured brown rice.`,
  }),
  recipe({
    title: 'Chole with Brown Rice',
    emoji: '🧆',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 15,
    cook: 35,
    kcal: 460,
    protein: 17,
    carbs: 74,
    fat: 9,
    fiber: 13,
    sugar: 6,
    tags: [WG, VN, HF, HP, GF],
    portion: '1 plate',
    ings: `80 g cooked chickpeas
50 g brown rice (dry)
1 tsp oil
Onion, tomato, chole masala`,
    steps: `Cook chickpeas until soft.
Make gravy with 1 tsp oil. Plate with 1 katori brown rice, not a heap.`,
  }),
  recipe({
    title: 'Roti with Dal',
    emoji: '🫓',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 15,
    cook: 25,
    kcal: 380,
    protein: 16,
    carbs: 58,
    fat: 7,
    fiber: 10,
    sugar: 3,
    tags: [WL, VN, HF, DF, HH],
    allergens: 'Gluten',
    portion: '2 rotis + 1 bowl dal',
    ings: `60 g whole-wheat flour (2 rotis)
40 g dal
1 tsp oil for dal tadka
Salad on the side`,
    steps: `Cook dal with a 1 tsp oil tadka.
Roll thin rotis without oil. Serve with salad, not pickle oil.`,
  }),
  recipe({
    title: 'Vegetable Curry',
    emoji: '🍛',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 12,
    cook: 35,
    kcal: 390,
    protein: 10,
    carbs: 58,
    fat: 12,
    fiber: 9,
    sugar: 8,
    tags: [WL, VN, HF, DF, GF, LO],
    portion: '1 bowl (200 g)',
    ings: `150 g mixed seasonal vegetables
1 tsp oil
40 g onion, chopped
40 g tomato, chopped
1/4 tsp turmeric
1/2 tsp coriander powder
1/4 tsp garam masala`,
    steps: `Sauté onion-tomato in 1 tsp oil.
Add vegetables and simmer. No cream or cashew paste.`,
  }),
  recipe({
    title: 'Paneer Curry',
    emoji: '🧀',
    mealType: 'Lunch',
    prep: 12,
    cook: 28,
    kcal: 530,
    protein: 25,
    carbs: 52,
    fat: 23,
    fiber: 3,
    sugar: 6,
    tags: [WG, HP, VG, GF],
    allergens: 'Dairy',
    portion: '1 bowl (80 g paneer)',
    ings: `80 g low-fat paneer
1 tsp oil
40 g onion, chopped
60 g tomato, chopped
1/4 tsp turmeric
1/2 tsp kasuri methi`,
    steps: `Pan-sear paneer in a non-stick pan without extra fat.
Simmer in gravy made with 1 tsp oil. Skip malai.`,
  }),
  recipe({
    title: 'Palak Paneer',
    emoji: '🥬',
    mealType: 'Lunch',
    prep: 15,
    cook: 25,
    kcal: 490,
    protein: 25,
    carbs: 50,
    fat: 19,
    fiber: 5,
    sugar: 4,
    tags: [WL, HP, VG, HF, GF],
    allergens: 'Dairy',
    portion: '1 bowl',
    ings: `1 cup blanched spinach
80 g low-fat paneer
1 tsp oil
Garlic, cumin, tomato`,
    steps: `Blend blanched spinach.
Cook with 1 tsp oil and spices, fold in paneer cubes. No cream.`,
  }),
  recipe({
    title: 'Mixed Vegetable Curry',
    emoji: '🥦',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 12,
    cook: 30,
    kcal: 380,
    protein: 10,
    carbs: 56,
    fat: 11,
    fiber: 8,
    sugar: 7,
    tags: [WL, VN, HF, DF, LO, GF],
    portion: '1 bowl',
    ings: `2 cups mixed vegetables
1 tsp oil
Tomato gravy, spices`,
    steps: `Cook vegetables until just tender in a light tomato gravy.
One teaspoon oil for the whole tadka.`,
  }),
  recipe({
    title: 'Sambar Rice',
    emoji: '🍲',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 15,
    cook: 30,
    kcal: 400,
    protein: 14,
    carbs: 68,
    fat: 6,
    fiber: 9,
    sugar: 5,
    tags: [WL, VN, HF, DF, GF],
    portion: '1 plate',
    ings: `50 g rice
40 g toor dal
Drumstick, pumpkin, brinjal
1 tsp oil
Sambar powder, tamarind`,
    steps: `Cook dal and vegetables with sambar powder.
Mix with measured rice. Temper with 1 tsp oil only.`,
  }),
  recipe({
    title: 'Rasam Rice',
    emoji: '🍅',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 10,
    cook: 20,
    kcal: 340,
    protein: 10,
    carbs: 62,
    fat: 4,
    fiber: 5,
    sugar: 4,
    tags: [WL, VN, LO, DF, GF],
    portion: '1 plate',
    ings: `50 g rice
Tomato rasam (tamarind, pepper, garlic, cumin)
1 tsp oil for tempering
Coriander`,
    steps: `Prepare pepper-tomato rasam with 1 tsp oil tadka.
Serve over measured rice. Light lunch option.`,
  }),
  recipe({
    title: 'Millet Rice',
    emoji: '🌱',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 8,
    cook: 25,
    kcal: 410,
    protein: 16,
    carbs: 72,
    fat: 5,
    fiber: 6,
    sugar: 1,
    tags: [WL, VN, HF, DF, GF, HH],
    portion: '1 katori cooked millet (150 g)',
    ings: `50 g foxtail or barnyard millet
150 ml water
Pinch salt`,
    steps: `Rinse millet, cook like rice until fluffy.
Use as a brown-rice swap under dal or curry.`,
  }),
  recipe({
    title: 'Quinoa Vegetable Bowl',
    emoji: '🥗',
    mealType: 'Lunch',
    dietType: 'Vegan',
    prep: 10,
    cook: 18,
    kcal: 390,
    protein: 14,
    carbs: 54,
    fat: 12,
    fiber: 8,
    sugar: 5,
    tags: [WL, HP, VN, HF, GF, HH],
    portion: '1 bowl',
    ings: `40 g quinoa
1 cup roasted vegetables
1/4 cup chickpeas
1 tsp olive oil lemon dressing`,
    steps: `Cook quinoa. Roast vegetables with 1 tsp oil.
Assemble bowl with chickpeas and lemon dressing.`,
  }),
  recipe({
    title: 'Grilled Chicken with Rice',
    emoji: '🍗',
    mealType: 'Lunch',
    dietType: 'Non-Vegetarian',
    prep: 15,
    cook: 25,
    kcal: 480,
    protein: 38,
    carbs: 48,
    fat: 12,
    fiber: 4,
    sugar: 3,
    tags: [WG, HP, HH],
    portion: '120 g chicken + 150 g cooked brown rice',
    ings: `120 g skinless chicken breast
50 g brown rice (dry)
1 tsp oil
2 tbsp low-fat yogurt (30 g)
1 tsp ginger-garlic paste
1/4 tsp chilli powder
1 tsp lemon juice
40 g cucumber-onion salad`,
    steps: `Marinate chicken in yogurt and spices 20 minutes.
Grill or pan-sear with 1 tsp oil. Serve with brown rice and salad.`,
  }),
  recipe({
    title: 'Fish Curry with Rice',
    emoji: '🐟',
    mealType: 'Lunch',
    dietType: 'Non-Vegetarian',
    prep: 15,
    cook: 20,
    kcal: 450,
    protein: 32,
    carbs: 48,
    fat: 12,
    fiber: 3,
    sugar: 4,
    tags: [HP, HH, GF],
    allergens: 'Fish',
    portion: '120 g fish + 150 g cooked rice',
    ings: `120 g fish fillet
50 g brown or red rice (dry)
1 tsp oil
Tomato-onion gravy, mustard or coconut thin milk optional
Turmeric, chilli`,
    steps: `Simmer fish in a light tomato gravy with 1 tsp oil.
Serve with measured rice. Prefer grilled or poached over deep-fried fish.`,
  }),
  recipe({
    title: 'Healthy Chicken Curry',
    emoji: '🥘',
    mealType: 'Lunch',
    dietType: 'Non-Vegetarian',
    prep: 15,
    cook: 35,
    kcal: 530,
    protein: 38,
    carbs: 46,
    fat: 20,
    fiber: 3,
    sugar: 4,
    tags: [WL, HP],
    portion: '1 bowl (120 g chicken)',
    ings: `120 g skinless chicken
1 tsp oil
40 g onion, chopped
40 g tomato, chopped
1 tsp ginger-garlic paste
1/4 tsp turmeric
1/4 tsp chilli powder
5 g coriander leaves`,
    steps: `Brown chicken in 1 tsp oil.
Simmer in onion-tomato gravy until cooked through. Skim extra fat.`,
  }),
  recipe({
    title: 'Vegetable Soup',
    emoji: '🥣',
    mealType: 'Dinner',
    dietType: 'Vegan',
    prep: 10,
    cook: 18,
    kcal: 200,
    protein: 7,
    carbs: 32,
    fat: 4,
    fiber: 5,
    sugar: 6,
    tags: [WL, LO, VN, HF, DF, KD],
    allergens: 'Gluten',
    portion: '1 bowl (300 ml)',
    ings: `2 cups mixed vegetables
500 ml vegetable stock
1 tsp oil
Pepper, herbs`,
    steps: `Sauté vegetables briefly in 1 tsp oil.
Simmer in stock 12 minutes. Blend half for body if you like.`,
  }),
  recipe({
    title: 'Chicken Soup',
    emoji: '🍜',
    mealType: 'Dinner',
    dietType: 'Non-Vegetarian',
    prep: 10,
    cook: 25,
    kcal: 300,
    protein: 27,
    carbs: 22,
    fat: 10,
    fiber: 3,
    sugar: 3,
    tags: [WL, HP, LO],
    allergens: 'Gluten',
    portion: '1 bowl',
    ings: `100 g chicken pieces, skinless
40 g carrot, diced
40 g beans, chopped
30 g celery, sliced
1/4 tsp black pepper
2 g ginger, minced
1 clove garlic, minced
1 tsp oil`,
    steps: `Simmer chicken and vegetables in water with ginger-garlic.
Skim fat. Season with pepper. No cream soup bases.`,
  }),
  recipe({
    title: 'Grilled Chicken',
    emoji: '🔥',
    mealType: 'Dinner',
    dietType: 'Non-Vegetarian',
    prep: 15,
    cook: 30,
    kcal: 450,
    protein: 40,
    carbs: 40,
    fat: 14,
    fiber: 3,
    sugar: 2,
    tags: [WL, HP, GF],
    portion: '120 g chicken breast',
    ings: `120 g skinless chicken breast
1 tsp oil
2 tbsp low-fat yogurt (30 g)
1/4 tsp chilli powder
1 tsp lemon juice
1 clove garlic, minced
40 g salad greens`,
    steps: `Marinate 15 minutes. Grill or oven-bake until juices run clear.
Serve with salad, not fried sides.`,
  }),
  recipe({
    title: 'Grilled Fish',
    emoji: '🐠',
    mealType: 'Dinner',
    dietType: 'Non-Vegetarian',
    prep: 10,
    cook: 25,
    kcal: 430,
    protein: 36,
    carbs: 38,
    fat: 14,
    fiber: 3,
    sugar: 2,
    tags: [WL, HP, HH, GF],
    allergens: 'Fish',
    portion: '120 g fillet',
    ings: `120 g fish fillet
1 tsp oil
Lemon, pepper, turmeric, garlic`,
    steps: `Pat fish dry, season, grill 5–6 minutes a side.
Lemon at the table instead of fried batter.`,
  }),
  recipe({
    title: 'Paneer Salad',
    emoji: '🥗',
    mealType: 'Dinner',
    prep: 12,
    cook: 5,
    kcal: 280,
    protein: 18,
    carbs: 12,
    fat: 16,
    fiber: 4,
    sugar: 6,
    tags: [WL, HP, VG, LC, GF],
    allergens: 'Dairy',
    portion: '1 bowl',
    ings: `80 g low-fat paneer cubes
Lettuce, cucumber, tomato, onion
1 tsp olive oil + lemon
Chaat masala`,
    steps: `Lightly toast paneer in a dry pan.
Toss with vegetables and lemon-oil dressing.`,
  }),
  recipe({
    title: 'Vegetable Salad',
    emoji: '🥒',
    mealType: 'Dinner',
    dietType: 'Vegan',
    prep: 12,
    cook: 0,
    kcal: 110,
    protein: 4,
    carbs: 14,
    fat: 4,
    fiber: 5,
    sugar: 6,
    tags: [WL, LO, VN, HF, DF, GF, HH],
    portion: '1 large bowl',
    ings: `2 cups cucumber, tomato, carrot, greens
1 tsp olive oil
Lemon, black salt, coriander`,
    steps: `Chop vegetables. Dress with lemon, 1 tsp oil and black salt.
Eat soon after chopping.`,
  }),
  recipe({
    title: 'Dal with Roti',
    emoji: '🍽️',
    mealType: 'Dinner',
    dietType: 'Vegan',
    prep: 10,
    cook: 25,
    kcal: 360,
    protein: 15,
    carbs: 54,
    fat: 7,
    fiber: 9,
    sugar: 3,
    tags: [WL, VN, HF, DF],
    allergens: 'Gluten',
    portion: '2 rotis + dal',
    ings: `40 g dal
60 g whole-wheat flour
1 tsp oil
Salad`,
    steps: `Cook a simple dal tadka with 1 tsp oil.
Serve with 2 thin rotis and salad. Lighter than rice at night.`,
  }),
  recipe({
    title: 'Vegetable Curry with Roti',
    emoji: '🥘',
    mealType: 'Dinner',
    dietType: 'Vegan',
    prep: 12,
    cook: 20,
    kcal: 340,
    protein: 10,
    carbs: 50,
    fat: 9,
    fiber: 8,
    sugar: 7,
    tags: [WL, VN, HF, DF],
    allergens: 'Gluten',
    portion: '2 rotis + curry',
    ings: `Mixed vegetables 1.5 cups
1 tsp oil
Tomato gravy
2 whole-wheat rotis`,
    steps: `Cook a dry-ish vegetable curry with 1 tsp oil.
Two rotis, not four.`,
  }),
  recipe({
    title: 'Millet Khichdi',
    emoji: '🌾',
    mealType: 'Dinner',
    dietType: 'Vegan',
    prep: 10,
    cook: 25,
    kcal: 340,
    protein: 12,
    carbs: 52,
    fat: 7,
    fiber: 8,
    sugar: 3,
    tags: [WL, VN, HF, DF, GF],
    portion: '1 bowl',
    ings: `40 g millet
30 g moong dal
80 g mixed vegetables (carrot, beans, peas)
1 tsp oil
1/4 tsp turmeric
1/2 tsp cumin seeds`,
    steps: `Pressure-cook millet, dal and vegetables.
Temper with 1 tsp oil. Easy night meal.`,
  }),
  recipe({
    title: 'Quinoa Bowl',
    emoji: '🥙',
    mealType: 'Dinner',
    dietType: 'Vegan',
    prep: 10,
    cook: 18,
    kcal: 360,
    protein: 13,
    carbs: 48,
    fat: 12,
    fiber: 7,
    sugar: 5,
    tags: [WL, VN, HF, HP, GF],
    portion: '1 bowl',
    ings: `40 g quinoa
Roasted vegetables
1 tsp olive oil
Lemon, herbs`,
    steps: `Cook quinoa. Top with roasted vegetables and lemon.
Keep oil to 1 teaspoon.`,
  }),
  recipe({
    title: 'Egg Curry with Roti',
    emoji: '🥚',
    mealType: 'Dinner',
    dietType: 'Eggetarian',
    prep: 10,
    cook: 20,
    kcal: 380,
    protein: 20,
    carbs: 40,
    fat: 14,
    fiber: 5,
    sugar: 5,
    tags: [HP, VG, DF],
    allergens: 'Egg, Gluten',
    portion: '2 eggs + 2 rotis',
    ings: `2 boiled eggs
Tomato-onion gravy
1 tsp oil
2 whole-wheat rotis`,
    steps: `Simmer halved eggs in a 1 tsp oil gravy.
Serve with 2 rotis, not fried puri.`,
  }),
  recipe({
    title: 'Chicken Curry with Roti',
    emoji: '🍛',
    mealType: 'Dinner',
    dietType: 'Non-Vegetarian',
    prep: 12,
    cook: 25,
    kcal: 420,
    protein: 34,
    carbs: 36,
    fat: 14,
    fiber: 5,
    sugar: 4,
    tags: [HP, WL],
    allergens: 'Gluten',
    portion: '120 g chicken + 2 rotis',
    ings: `120 g skinless chicken
1 tsp oil
Onion-tomato gravy
2 whole-wheat rotis`,
    steps: `Cook chicken curry with 1 tsp oil and no cream.
Two rotis. Remove visible fat.`,
  }),
  recipe({
    title: 'Mixed Vegetable Stir Fry',
    emoji: '🥬',
    mealType: 'Dinner',
    dietType: 'Vegan',
    prep: 10,
    cook: 25,
    kcal: 330,
    protein: 9,
    carbs: 54,
    fat: 9,
    fiber: 8,
    sugar: 7,
    tags: [WL, VN, HF, GF],
    portion: '1 plate',
    ings: `2 cups mixed vegetables
1 tsp oil
Garlic, pepper, soya sauce low-sodium optional`,
    steps: `Stir-fry vegetables on high heat in 1 tsp oil until crisp-tender.
Do not drown in sauce.`,
  }),
  recipe({
    title: 'Healthy Wraps',
    emoji: '🌯',
    mealType: 'Dinner',
    dietType: 'Vegan',
    prep: 12,
    cook: 8,
    kcal: 320,
    protein: 12,
    carbs: 42,
    fat: 10,
    fiber: 8,
    sugar: 5,
    tags: [WL, VN, HF, KD],
    allergens: 'Gluten',
    portion: '1 wrap',
    ings: `1 whole-wheat roti
1/2 cup sautéed vegetables
2 tbsp hung curd or hummus
Lettuce`,
    steps: `Warm roti. Spread hung curd or hummus.
Fill with vegetables, roll tight. No mayonnaise.`,
  }),
  recipe({
    title: 'Roasted Chana',
    emoji: '🫘',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 2,
    cook: 0,
    kcal: 140,
    protein: 8,
    carbs: 22,
    fat: 3,
    fiber: 6,
    sugar: 1,
    tags: [WL, HP, VN, HF, DF, GF, LO],
    portion: '30 g',
    ings: `30 g roasted chana
Chaat masala pinch
Lemon optional`,
    steps: `Measure 30 g. Sprinkle chaat masala.
High-fibre crunch without fried namkeen.`,
  }),
  recipe({
    title: 'Roasted Makhana',
    emoji: '⚪',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 2,
    cook: 10,
    kcal: 120,
    protein: 4,
    carbs: 16,
    fat: 4,
    fiber: 2,
    sugar: 0,
    tags: [WL, LO, VN, DF, GF, KD],
    portion: '2 cups popped (20 g)',
    ings: `20 g fox nuts
1 tsp ghee or oil
Black salt, pepper`,
    steps: `Roast makhana in 1 tsp ghee until crisp.
Season lightly. Stop at a small bowl.`,
  }),
  recipe({
    title: 'Fruit Bowl',
    emoji: '🍎',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 8,
    cook: 0,
    kcal: 130,
    protein: 2,
    carbs: 32,
    fat: 0,
    fiber: 5,
    sugar: 22,
    tags: [WL, VN, HF, GF, KD, HH],
    portion: '1 bowl (150 g)',
    ings: `Apple, papaya, guava or berries 150 g
Lemon, chaat masala`,
    steps: `Chop fruit. Toss with lemon.
Prefer lower-GI fruit for diabetes plans.`,
  }),
  recipe({
    title: 'Mixed Nuts',
    emoji: '🥜',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 1,
    cook: 0,
    kcal: 180,
    protein: 6,
    carbs: 6,
    fat: 16,
    fiber: 3,
    sugar: 2,
    tags: [WG, VN, HH, GF],
    allergens: 'Tree nuts, Peanuts',
    portion: '20 g (a small handful)',
    ings: `Almonds, walnuts, pistachios mixed 20 g
Unsalted`,
    steps: `Weigh 20 g. Unsalted, unfried.
Portion control matters more than variety.`,
  }),
  recipe({
    title: 'Almonds and Walnuts',
    emoji: '🌰',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 1,
    cook: 0,
    kcal: 190,
    protein: 6,
    carbs: 5,
    fat: 17,
    fiber: 3,
    sugar: 1,
    tags: [HH, VN, GF, WG],
    allergens: 'Tree nuts',
    portion: '6 almonds + 2 walnuts',
    ings: `6 almonds
2 walnut halves`,
    steps: `Soak almonds if preferred. Eat as a measured snack, not from the jar.`,
  }),
  recipe({
    title: 'Greek Yogurt',
    emoji: '🥛',
    mealType: 'Snack',
    prep: 2,
    cook: 0,
    kcal: 140,
    protein: 14,
    carbs: 8,
    fat: 4,
    fiber: 0,
    sugar: 6,
    tags: [WL, HP, VG, DF, GF, KD],
    allergens: 'Dairy',
    portion: '150 g',
    ings: `150 g unsweetened Greek yogurt or hung curd
Cinnamon or 4 berries`,
    steps: `Serve unsweetened. Fruit is the only sweetener.`,
  }),
  recipe({
    title: 'Sprouts Salad',
    emoji: '🌱',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 10,
    cook: 0,
    kcal: 160,
    protein: 10,
    carbs: 22,
    fat: 3,
    fiber: 7,
    sugar: 4,
    tags: [WL, HP, VN, HF, DF, GF],
    portion: '1 bowl (100 g sprouts)',
    ings: `100 g mixed sprouts
Onion, tomato, cucumber
Lemon, chaat masala, coriander`,
    steps: `Toss sprouts with chopped salad and lemon.
Steam lightly if raw sprouts are not tolerated.`,
  }),
  recipe({
    title: 'Corn Chaat',
    emoji: '🌽',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 8,
    cook: 5,
    kcal: 150,
    protein: 5,
    carbs: 28,
    fat: 3,
    fiber: 4,
    sugar: 6,
    tags: [WL, VN, KD, GF, LO],
    portion: '1 bowl',
    ings: `80 g boiled sweet corn
Onion, tomato, coriander
Lemon, chaat masala
No sev`,
    steps: `Mix boiled corn with onion, tomato and lemon.
Skip fried sev and butter.`,
  }),
  recipe({
    title: 'Vegetable Chaat',
    emoji: '🥗',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 12,
    cook: 0,
    kcal: 130,
    protein: 4,
    carbs: 20,
    fat: 3,
    fiber: 5,
    sugar: 7,
    tags: [WL, VN, LO, HF, KD, GF],
    portion: '1 bowl',
    ings: `Boiled potato 40 g
Cucumber, tomato, onion, pomegranate
Lemon, chaat masala
No puri or sev`,
    steps: `Chop and toss. Keep potato small.
This is salad chaat, not street fried chaat.`,
  }),
  recipe({
    title: 'Peanut Chaat',
    emoji: '🥜',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 8,
    cook: 0,
    kcal: 200,
    protein: 9,
    carbs: 12,
    fat: 14,
    fiber: 4,
    sugar: 3,
    tags: [WG, HP, VN, GF],
    allergens: 'Peanuts',
    portion: '30 g peanuts + salad',
    ings: `30 g roasted peanuts
Onion, tomato, coriander
Lemon, chilli, salt`,
    steps: `Mix roasted peanuts with salad and lemon.
Measure peanuts first.`,
  }),
  recipe({
    title: 'Boiled Eggs',
    emoji: '🥚',
    mealType: 'Snack',
    dietType: 'Eggetarian',
    prep: 2,
    cook: 10,
    kcal: 155,
    protein: 13,
    carbs: 1,
    fat: 11,
    fiber: 0,
    sugar: 1,
    tags: [WL, HP, LC, GF, LO],
    allergens: 'Egg',
    portion: '2 eggs',
    ings: `2 eggs
Black pepper, chaat masala`,
    steps: `Boil, peel, season. Pair with cucumber if you want volume.`,
  }),
  recipe({
    title: 'Protein Balls',
    emoji: '⚽',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 15,
    cook: 0,
    kcal: 180,
    protein: 8,
    carbs: 20,
    fat: 8,
    fiber: 4,
    sugar: 12,
    tags: [WG, HP, VN, KD],
    allergens: 'Tree nuts, Peanuts',
    portion: '2 balls',
    ings: `4 dates
1 tbsp oats
1 tbsp peanut or almond butter
1 tsp flaxseed
Cocoa optional`,
    steps: `Blend dates with oats, nut butter and flax.
Roll 2 balls. Refrigerate. No condensed milk.`,
  }),
  recipe({
    title: 'Dates and Nuts',
    emoji: '🌴',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 2,
    cook: 0,
    kcal: 170,
    protein: 4,
    carbs: 22,
    fat: 8,
    fiber: 3,
    sugar: 18,
    tags: [WG, VN, GF, KD],
    allergens: 'Tree nuts',
    portion: '2 dates + 4 almonds',
    ings: `2 dates
4 almonds`,
    steps: `Stuff dates with almonds if you like. Cap at this portion.`,
  }),
  recipe({
    title: 'Healthy Sandwich',
    emoji: '🥪',
    mealType: 'Snack',
    prep: 10,
    cook: 4,
    kcal: 250,
    protein: 12,
    carbs: 32,
    fat: 7,
    fiber: 5,
    sugar: 4,
    tags: [WL, VG, HF, KD],
    allergens: 'Gluten, Dairy',
    portion: '1 sandwich',
    ings: `2 slices whole-wheat bread (50 g)
2 tbsp hung curd (30 g)
40 g cucumber, sliced
30 g tomato, sliced
1/4 tsp black pepper
1/4 tsp chaat masala`,
    steps: `Spread hung curd, layer vegetables, toast if you want.
No cheese slices or mayonnaise.`,
  }),
  recipe({
    title: 'Hummus with Vegetables',
    emoji: '🥕',
    mealType: 'Snack',
    dietType: 'Vegan',
    prep: 10,
    cook: 0,
    kcal: 180,
    protein: 7,
    carbs: 18,
    fat: 8,
    fiber: 6,
    sugar: 4,
    tags: [WL, VN, HF, HP, GF],
    portion: '2 tbsp hummus + 1 cup sticks',
    ings: `2 tbsp homemade hummus (30 g)
40 g cucumber sticks
40 g carrot sticks
30 g capsicum sticks`,
    steps: `Serve measured hummus with vegetable sticks.
Skip fried pita chips.`,
  }),
  recipe({
    title: 'Healthy Chicken Biryani',
    emoji: '🍗',
    mealType: 'Biryani',
    dietType: 'Non-Vegetarian',
    prep: 20,
    cook: 35,
    kcal: 480,
    protein: 32,
    carbs: 52,
    fat: 14,
    fiber: 4,
    sugar: 4,
    tags: [HP, WG],
    portion: '1 bowl (120 g chicken + 150 g cooked rice)',
    ings: `120 g skinless chicken
50 g basmati (dry)
80 g mixed vegetables (carrot, beans, peas)
1 tsp oil
2 tbsp low-fat yogurt (30 g)
2 green cardamom
2 cloves
1 small bay leaf
5 g mint leaves
5 g coriander leaves`,
    notes: 'Use 1 tsp oil, skinless chicken, extra vegetables, and a measured rice katori — no fried onions in ghee.',
    steps: `Marinate chicken in yogurt and spices.
Parboil rice. Layer with vegetables and chicken, dum 15 minutes.
Serve one bowl, not a family platter.`,
  }),
  recipe({
    title: 'High Protein Chicken Biryani',
    emoji: '💪',
    mealType: 'Biryani',
    dietType: 'Non-Vegetarian',
    prep: 20,
    cook: 35,
    kcal: 500,
    protein: 40,
    carbs: 48,
    fat: 14,
    fiber: 4,
    sugar: 3,
    tags: [HP, WG],
    portion: '1 bowl (150 g chicken + 120 g cooked rice)',
    ings: `150 g skinless chicken breast
40 g basmati (dry)
80 g mixed vegetables (carrot, beans, peas)
1 tsp oil
2 tbsp low-fat yogurt (30 g)
1/4 tsp turmeric
1/2 tsp biryani masala`,
    notes: 'More lean chicken, less rice. Controlled oil. Vegetables in every layer.',
    steps: `Use extra chicken and a smaller rice portion.
Cook dum with 1 tsp oil and plenty of vegetables.`,
  }),
  recipe({
    title: 'Brown Rice Chicken Biryani',
    emoji: '🌾',
    mealType: 'Biryani',
    dietType: 'Non-Vegetarian',
    prep: 25,
    cook: 40,
    kcal: 470,
    protein: 32,
    carbs: 50,
    fat: 12,
    fiber: 6,
    sugar: 4,
    tags: [HP, HF, DF, HH],
    portion: '1 bowl',
    ings: `120 g skinless chicken
50 g brown rice (dry)
80 g mixed vegetables (carrot, beans, peas)
1 tsp oil
2 tbsp low-fat yogurt (30 g)
1/2 tsp biryani masala`,
    notes: 'Brown rice for fibre. Lean protein. 1 tsp oil. Extra vegetables.',
    steps: `Parboil brown rice longer than basmati.
Layer with grilled chicken and vegetables, dum until rice is tender.`,
  }),
  recipe({
    title: 'Vegetable Biryani',
    emoji: '🥕',
    mealType: 'Biryani',
    dietType: 'Vegan',
    prep: 20,
    cook: 30,
    kcal: 390,
    protein: 10,
    carbs: 64,
    fat: 10,
    fiber: 8,
    sugar: 6,
    tags: [WL, VN, HF, DF],
    portion: '1 bowl',
    ings: `50 g basmati or brown rice (dry)
150 g mixed vegetables (carrot, beans, peas, cauliflower)
1 tsp oil
2 green cardamom
2 cloves
1 small bay leaf
5 g mint leaves
4 saffron strands in 1 tbsp water (optional)`,
    notes: 'Vegetable-heavy, 1 tsp oil, measured rice, no fried onion garnish.',
    steps: `Sauté vegetables in 1 tsp oil with spices.
Layer with parboiled rice and mint, dum 12 minutes.`,
  }),
  recipe({
    title: 'Paneer Biryani',
    emoji: '🧀',
    mealType: 'Biryani',
    prep: 20,
    cook: 30,
    kcal: 450,
    protein: 20,
    carbs: 52,
    fat: 16,
    fiber: 5,
    sugar: 5,
    tags: [HP, VG, WG],
    allergens: 'Dairy',
    portion: '1 bowl (80 g paneer)',
    ings: `80 g low-fat paneer
50 g rice (dry)
80 g mixed vegetables (carrot, beans, peas)
1 tsp oil
2 tbsp low-fat yogurt (30 g)
1/2 tsp biryani masala`,
    notes: 'Low-fat paneer, 1 tsp oil, extra vegetables, one katori rice.',
    steps: `Marinate paneer in yogurt spices.
Layer with rice and vegetables. Do not deep-fry paneer first.`,
  }),
  recipe({
    title: 'Egg Biryani',
    emoji: '🥚',
    mealType: 'Biryani',
    dietType: 'Eggetarian',
    prep: 15,
    cook: 30,
    kcal: 430,
    protein: 18,
    carbs: 54,
    fat: 14,
    fiber: 4,
    sugar: 4,
    tags: [HP, VG],
    allergens: 'Egg',
    portion: '1 bowl (2 eggs)',
    ings: `2 boiled eggs
50 g rice (dry)
80 g mixed vegetables (carrot, beans, peas)
1 tsp oil
1/2 tsp biryani masala
5 g mint leaves`,
    notes: 'Boiled eggs instead of fried. 1 tsp oil. Vegetables in the masala.',
    steps: `Prepare a vegetable masala with 1 tsp oil.
Layer rice and halved eggs, dum 10 minutes.`,
  }),
  recipe({
    title: 'Fish Biryani',
    emoji: '🐟',
    mealType: 'Biryani',
    dietType: 'Non-Vegetarian',
    prep: 20,
    cook: 25,
    kcal: 460,
    protein: 30,
    carbs: 50,
    fat: 14,
    fiber: 3,
    sugar: 3,
    tags: [HP, HH],
    allergens: 'Fish',
    portion: '1 bowl (120 g fish)',
    ings: `120 g firm fish
50 g rice (dry)
80 g mixed vegetables (carrot, beans, peas)
1 tsp oil
2 tbsp low-fat yogurt (30 g)
1/4 tsp mustard powder
1/2 tsp garam masala`,
    notes: 'Grill or dum the fish — do not deep-fry. Controlled oil and rice.',
    steps: `Marinate fish. Parboil rice.
Gentle dum so the fish stays in pieces. Serve one bowl.`,
  }),
  recipe({
    title: 'Millet Biryani',
    emoji: '🌱',
    mealType: 'Biryani',
    dietType: 'Vegan',
    prep: 15,
    cook: 25,
    kcal: 370,
    protein: 11,
    carbs: 58,
    fat: 9,
    fiber: 8,
    sugar: 5,
    tags: [WL, VN, HF, DF, GF],
    portion: '1 bowl',
    ings: `50 g foxtail millet (dry)
150 g mixed vegetables (carrot, beans, peas)
1 tsp oil
2 green cardamom
2 cloves
1 small bay leaf
5 g mint leaves`,
    notes: 'Millet instead of white rice. Extra vegetables. 1 tsp oil. One bowl portion.',
    steps: `Parboil millet. Layer with spiced vegetables and mint.
Dum 12 minutes. Fluff gently.`,
  }),
  recipe({
    title: 'Quinoa Biryani',
    emoji: '🥗',
    mealType: 'Biryani',
    dietType: 'Vegan',
    prep: 15,
    cook: 22,
    kcal: 380,
    protein: 13,
    carbs: 52,
    fat: 12,
    fiber: 7,
    sugar: 5,
    tags: [WL, HP, VN, HF, GF],
    portion: '1 bowl',
    ings: `40 g quinoa (dry)
150 g mixed vegetables (carrot, beans, peas)
1 tsp oil
1/2 tsp biryani masala
5 g mint leaves`,
    notes: 'Quinoa base, vegetable-heavy, 1 tsp oil, measured serving.',
    steps: `Cook quinoa until just done.
Fold through a 1 tsp oil vegetable masala and rest covered 5 minutes.`,
  }),
  recipe({
    title: 'Soya Chunk Biryani',
    emoji: '🫘',
    mealType: 'Biryani',
    dietType: 'Vegan',
    prep: 20,
    cook: 30,
    kcal: 420,
    protein: 24,
    carbs: 54,
    fat: 10,
    fiber: 9,
    sugar: 5,
    tags: [HP, VN, WG, HF],
    portion: '1 bowl',
    ings: `40 g dry soya chunks, soaked and squeezed
50 g rice or millet (dry)
80 g mixed vegetables (carrot, beans, peas)
1 tsp oil
1/2 tsp biryani masala
5 g mint leaves`,
    notes: 'Lean plant protein, 1 tsp oil, extra vegetables, measured grain portion.',
    steps: `Soak soya, squeeze well, toss in spices.
    Layer with parboiled rice and vegetables, dum 12 minutes.`,
  }),
];

export const HEALTHY_INDIAN_RECIPES = [
  ...CORE_HEALTHY_INDIAN_RECIPES,
  ...buildExpandedHealthyIndianRecipes(CORE_HEALTHY_INDIAN_RECIPES.map((item) => item.title)),
];
