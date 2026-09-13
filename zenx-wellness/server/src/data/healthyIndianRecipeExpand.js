import { catalogImageFor } from './healthyIndianRecipeContent.js';

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
    if (tag === LO) return kcal <= 250;
    if (tag === HP) return protein >= 15;
    if (tag === LC) return carbs <= 30;
    if (tag === HF) return fiber >= 5;
    if (tag === DF) return sugar <= 12 && carbs <= 60;
    if (tag === HH) return fat <= 15;
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

function make({
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
  portion,
  ings,
  steps,
  notes = null,
}) {
  const suitable = mealType === 'Smoothies' ? 'Breakfast' : mealType === 'Biryani' ? 'Lunch' : mealType;
  const ingredientText = String(ings).trim();
  const resolvedAllergens = detectedAllergens(allergens, ingredientText, title);
  const resolvedTags = validatedTags(tags, { kcal, protein, carbs, fat, fiber, sugar }).filter(
    (tag) => tag !== GF || !resolvedAllergens.includes('Gluten')
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
    portionSize: portion,
    allergens: resolvedAllergens,
    suitableMealType: suitable,
    tags: resolvedTags,
    ingredients: ingredientText,
    instructions: numberedSteps(steps),
    healthNotes: notes,
    imageUrl: catalogImageFor(title, mealType),
  };
}

function add(list, seen, recipe) {
  if (!recipe?.title || seen.has(recipe.title)) return;
  seen.add(recipe.title);
  list.push(recipe);
}

function veganTags(extra = []) {
  return [WL, VN, HF, DF, HH, LO, ...extra].filter((tag, i, arr) => arr.indexOf(tag) === i);
}

function vegTags(extra = []) {
  return [WL, VG, HF, DF, ...extra].filter((tag, i, arr) => arr.indexOf(tag) === i);
}

function eggTags(extra = []) {
  return [HP, WL, DF, ...extra].filter((tag, i, arr) => arr.indexOf(tag) === i);
}

function nvTags(extra = []) {
  return [HP, HH, DF, ...extra].filter((tag, i, arr) => arr.indexOf(tag) === i);
}

function blendSteps(fruit, extra) {
  return `Wash and prep the ${fruit.toLowerCase()}; measure the portion listed.
Add the listed liquid, ${extra}, and 4 ice cubes to a blender jar.
Blend 45–60 seconds until completely smooth, scraping once if needed.
Taste; do not add sugar. Thin with 2 tbsp water only if too thick.
Pour into a 300 ml glass and drink immediately.`;
}

function dalPlateSteps(dal, grain) {
  return `Rinse ${dal} until the water runs clear, then soak 15 minutes and drain.
Pressure cook with turmeric, crushed ginger, green chilli and water until soft (3–4 whistles).
Heat 1 tsp oil, crackle cumin and garlic, pour over the dal and simmer 3 minutes. Mash lightly.
Cook ${grain} separately until fluffy. Measure 1 cup cooked grain — do not add extra.
Plate 1 katori dal with the grain, cucumber-onion salad and lemon.
Eat as one complete plate.`;
}

function sabziPlateSteps(title, mainIngredient, base) {
  if (title === 'Baingan Bharta') {
    return `Pierce the eggplant and roast it over a flame or at 220°C for 20–25 minutes until completely soft.
Cool, peel and mash the flesh; discard the charred skin.
Heat 1 tsp oil, cook cumin, ginger-garlic, onion and tomato until thick, then stir in the mashed eggplant for 5 minutes.
Finish with coriander and serve one katori with ${base} and cucumber salad.
Do not add extra oil, butter or fried papad.`;
  }
  if (title === 'Beans Poriyal') {
    return `Wash, trim and cut the green beans into 1 cm pieces.
Heat 1 tsp oil, splutter mustard seeds, then add the beans, turmeric and 2 tbsp water.
Cover and cook 7–9 minutes until crisp-tender; finish with 1 tsp grated coconut and coriander.
Serve one katori with ${base} and cucumber salad. Do not add fried papad.`;
  }
  return `Wash and cut the ${mainIngredient} into even pieces so they cook at the same time.
Heat 1 tsp oil, add cumin, ginger-garlic and onion; saute until the onion turns pale gold.
Stir in tomato, turmeric, chilli powder and salt. Cook until the masala thickens.
Add the ${mainIngredient}, cover and cook on low until just tender. Finish with coriander.
Serve with ${base} and a katori salad. Do not add extra oil or fried papad.
This is one complete plate — grain/roti plus sabzi together.`;
}

function biryaniSteps(protein, grain) {
  return `Rinse ${grain.toLowerCase()} and soak 15 minutes. Parboil with whole spices until 70% cooked; drain.
Marinate ${protein.toLowerCase()} with the measured lemon, ginger-garlic, turmeric and biryani masala for 15 minutes.
Heat 1 tsp oil, cook onion until light brown, add the marinated ${protein.toLowerCase()} and vegetables, saute 4–6 minutes.
Layer the cooked ${protein.toLowerCase()} with the parboiled ${grain.toLowerCase()}, mint and coriander.
Cover tightly and dum-cook 12 minutes on the lowest flame. Rest 5 minutes.
Fluff gently and serve 1 measured bowl with the cucumber-onion salad. Do not add ghee.`;
}

function soupSteps(title) {
  const t = title.toLowerCase();
  if (t.includes('chicken')) {
    return `Cut the chicken and vegetables into small even pieces.
Sweat onion, garlic and ginger in 1 tsp oil for 2 minutes without browning.
Add the chicken, vegetables and 400 ml water or stock. Simmer 15–18 minutes until the chicken reaches 74°C.
Season lightly and serve one large bowl with the measured whole-wheat toast.`;
  }
  if (t.includes('moong') || t.includes('lentil') || t.includes('mulligatawny')) {
    return `Rinse the measured moong dal until the water runs clear.
Sweat onion, garlic and ginger in 1 tsp oil for 2 minutes, then add the dal and listed vegetables.
Add 400 ml water or stock and simmer 18–20 minutes until the dal is soft.
Blend partly for body, season lightly and serve one large bowl with the measured toast.`;
  }
  return `Wash and chop every listed vegetable into small even pieces.
Sweat onion, garlic and ginger in 1 tsp oil for 2 minutes without browning.
Add the listed vegetables, seasonings and 400 ml water or stock. Simmer 12–15 minutes until soft.
Blend partly or fully, then return to the pan. Adjust thickness with water, not cream.
Serve 1 bowl with 1 slice toasted whole-wheat bread. Eat as the full meal.`;
}

function chillaSteps(batter, filling) {
  return `Mix ${batter} with water to a pourable batter. Rest 5 minutes. Add salt, cumin and chopped ${filling.toLowerCase()}.
Heat a non-stick tawa, brush 1/2 tsp oil, pour a ladle and spread into a thin round.
Cover and cook 2 minutes until the underside is spotted. Flip and cook 1 minute more.
Repeat for a second chilla from the same batter.
Serve both chillas with the measured mint chutney and sambar as one plate.`;
}

function dosaSteps(grain) {
  return `Spread a ladle of ${grain.toLowerCase()} batter thinly on a hot tawa. Drizzle 1/2 tsp oil around the edge.
Cook until the underside is crisp and golden, then fold. Make a second dosa the same way.
Warm 1 katori sambar and 2 tbsp coconut chutney.
Plate 2 dosas with sambar and chutney. Do not add extra oil or potato masala.
Eat as a complete breakfast plate.`;
}

function grainBreakfastSteps(grain, shape) {
  const g = grain.toLowerCase();
  if (shape === 'Porridge') {
    return `Rinse the ${g}. Simmer it with 250 ml water for 12–15 minutes, stirring twice, until soft and creamy.
Heat 1 tsp oil in a small pan. Cook the measured onion, tomato and carrot with mustard, turmeric and chilli for 4 minutes.
Fold the cooked vegetables through the porridge and simmer 2 minutes.
Serve one measured bowl while hot. Keep the sambar and chutney for another meal.`;
  }
  if (shape === 'Upma') {
    return `Dry-roast the ${g} rava or broken grain for 3 minutes; transfer it to a plate.
Heat 1 tsp oil. Splutter mustard, then sauté the measured onion, tomato, carrot and chilli for 4 minutes.
Add 250 ml water and turmeric; bring to a boil. Stir in the roasted grain slowly so it does not form lumps.
Cover and cook on low for 6–8 minutes. Fluff and serve one bowl with the measured coconut chutney.`;
  }
  if (shape === 'Poha') {
    return `Rinse the ${g} flakes briefly and drain for 5 minutes so they soften without becoming mushy.
Heat 1 tsp oil. Splutter mustard, then cook the measured onion, tomato, carrot, chilli and turmeric for 4 minutes.
Fold in the drained flakes and cook for 2 minutes, stirring gently.
Serve one plate while hot with the measured coconut chutney.`;
  }
  if (shape === 'Idli') {
    return `Stir the measured onion, tomato, carrot, chilli and turmeric into the ${g} idli batter.
Lightly brush three idli moulds with the measured oil and divide the batter evenly.
Steam for 10–12 minutes, until a skewer comes out clean. Rest 2 minutes before unmoulding.
Serve 3 idlis with the measured sambar and coconut chutney.`;
  }
  return `Measure and prepare the ${g} exactly as listed.
Cook the measured vegetables in 1 tsp oil with mustard and turmeric until tender.
Combine, cook until the grain is tender, and serve the listed portion with the measured sides.`;
}

function grainAmount(grain, shape) {
  const g = grain.toLowerCase();
  if (shape === 'Porridge') return `40 g ${g} (flakes or groats)`;
  if (shape === 'Upma') return `40 g ${g} rava or broken grain`;
  if (shape === 'Poha') return `40 g thick poha or ${g} flakes`;
  if (shape === 'Idli') return `80 g ${g} idli batter (from 40 g dry grain)`;
  if (shape === 'Dosa' || shape === 'Uttapam') return `90 g ${g} dosa batter (from 40 g dry grain)`;
  if (shape === 'Chilla') return `40 g ${g} flour`;
  return `40 g ${g}`;
}

function grainBreakfastIngs(grain, shape) {
  return `${grainAmount(grain, shape)}
30 g onion, finely chopped
30 g tomato, chopped
20 g carrot, grated
1 tsp oil
1/4 tsp mustard seeds
1/4 tsp turmeric
1 green chilli, chopped
1 katori (120 g) sambar
2 tbsp coconut chutney`;
}

function fillingBreakfastIngs(filling, shape) {
  const f = filling.toLowerCase();
  if (shape === 'Paratha' || shape === 'Thepla') {
    return `80 g whole-wheat flour (for 2 breads)
80 g spiced ${f} filling
1 tsp oil
1 katori (120 g) dal
40 g cucumber salad`;
  }
  if (shape === 'Chilla') {
    return `40 g besan
80 ml water
80 g chopped ${f}
1 tsp oil
2 tbsp mint chutney
1 katori (120 g) sambar`;
  }
  return `90 g dosa batter
80 g chopped ${f}
1 tsp oil
1 katori (120 g) sambar
2 tbsp coconut chutney`;
}

function filledBreakfastSteps(filling, shape) {
  const f = filling.toLowerCase();
  if (shape === 'Dosa' || shape === 'Uttapam') {
    return `Heat a non-stick tawa and brush it with 0.5 tsp oil.
Pour half the measured batter; spread it thin for dosa or leave it 1 cm thick for uttapam.
Scatter half the measured ${f} evenly, cover and cook until the base is golden; flip and cook the filling through.
Repeat with the remaining batter and oil. Serve both pieces with the measured sambar and chutney.`;
  }
  if (shape === 'Paratha' || shape === 'Thepla') {
    return `Combine the whole-wheat flour with 45 ml water and knead for 4 minutes; rest the dough for 10 minutes.
Divide into two portions and enclose half the measured spiced ${f} filling in each.
Roll gently to 15 cm and cook each bread on a hot tawa with 0.5 tsp oil, about 2 minutes per side.
Serve both breads with the measured dal and cucumber salad.`;
  }
  return chillaSteps('besan batter', filling);
}

function extraBreakfastSteps(title) {
  const t = title.toLowerCase();
  if (t.includes('idli') || t.includes('dhokla') || t.includes('handvo')) {
    return `Mix the measured batter and vegetables until evenly combined.
Divide into lightly oiled moulds or a shallow steaming tin.
Steam for 10–12 minutes, until the centre is firm and a skewer comes out clean.
Rest 2 minutes, portion as listed and serve with the measured chutney or sambar.`;
  }
  if (t.includes('appam')) {
    return `Warm an appam pan and pour in half the measured batter.
Swirl once to make a thin lacy edge, cover and cook 2–3 minutes without flipping.
Repeat for the second appam and warm the measured vegetable stew separately.
Serve 2 appams with 120 g stew.`;
  }
  if (t.includes('adai')) {
    return `Stir the lentil-rice batter well and thin it with 1–2 tbsp water only if it does not pour.
Heat a non-stick tawa, brush with half the measured oil and spread half the batter into a 15 cm round.
Cook 2–3 minutes per side until the centre is firm and both sides have brown spots; repeat for the second adai.
Warm the measured avial and serve it with the two adai.`;
  }
  if (t.includes('idiyappam') || t.includes('puttu')) {
    return `Moisten the measured flour gradually with water until it holds when pressed but is not wet.
Press into idiyappam nests or layer loosely in a puttu mould, then steam for 8–10 minutes.
Warm the measured vegetable stew or kadala curry until simmering.
Serve the listed steamed portion with its measured curry.`;
  }
  if (t.includes('pongal') || t.includes('khichdi')) {
    return `Rinse the listed grain and dal until the water runs clear.
Cook with 300 ml water until very soft, about 15–18 minutes.
Heat the measured oil or ghee, crackle cumin and pepper, then stir the tempering into the cooked grain.
Serve one measured bowl with the listed sambar or chutney.`;
  }
  if (t.includes('mudde')) {
    return `Bring 200 ml water to a boil and whisk in the measured ragi flour gradually.
Cook on low for 6–8 minutes, stirring firmly, until the dough leaves the pan.
Shape one ball with wet hands and warm the measured sambar separately.
Serve the ragi mudde with sambar and vegetable palya.`;
  }
  if (t.includes('bhakri') || t.includes('rotla') || t.includes('roti') || t.includes('thalipeeth')) {
    return `Mix the measured flour, vegetables and 45 ml warm water into a soft dough; rest 10 minutes.
Divide into two portions and pat or roll each into a thin round.
Cook on a hot tawa with the measured oil until brown spots appear on both sides.
Serve both breads with the listed thecha, kadhi, chutney or salad.`;
  }
  if (t.includes('bhurji') || t.includes('omelette')) {
    const protein = t.includes('paneer') ? 'paneer' : t.includes('tofu') ? 'tofu' : t.includes('mushroom') ? 'mushroom' : 'egg';
    return `Heat a non-stick pan with the measured oil and cook the onion-tomato vegetables for 3 minutes.
Add the measured ${protein} and cook until hot and set; cook egg until no liquid remains.
Warm the listed phulkas or toast separately without extra oil.
Serve the bhurji or omelette immediately with its measured side.`;
  }
  if (t.includes('egg dosa')) {
    return `Spread the measured dosa batter thinly on a hot, lightly oiled tawa.
Crack the egg over the batter and spread it to the edges.
Cook until the egg is completely set and the dosa base is crisp, then fold.
Serve with the measured sambar and coconut chutney.`;
  }
  if (t.includes('boiled eggs')) {
    return `Boil the eggs for 10 minutes, cool under running water and peel.
Cook the measured millet upma with vegetables until tender.
Place the eggs beside one measured bowl of upma and the salad.
Serve warm as one complete breakfast plate.`;
  }
  return `Measure every ingredient before starting.
Cook the grain or batter with the listed vegetables and measured oil until completely cooked.
Warm the listed curry, sambar or chutney separately.
Serve only the stated breakfast portion.`;
}

function cookedGrainLine(grain) {
  const g = String(grain).toLowerCase();
  if (g.includes('phulka')) return '2 whole-wheat phulkas (30 g flour each)';
  if (g.includes('quinoa')) return '1 cup cooked quinoa (50 g dry)';
  if (g.includes('foxtail') || g === 'millet' || g.includes('millet')) return '1 cup cooked millet (50 g dry)';
  if (g.includes('brown')) return '1 cup cooked brown rice (50 g dry)';
  if (g.includes('red rice')) return '1 cup cooked red rice (50 g dry)';
  return `1 cup cooked ${grain} (50 g dry)`;
}

const SABZI_INGREDIENTS = {
  'Bhindi Masala': ['150 g okra (bhindi)', 'okra'],
  'Baingan Bharta': ['150 g eggplant (baingan)', 'eggplant'],
  'Lauki Curry': ['150 g bottle gourd (lauki)', 'bottle gourd'],
  'Tinda Curry': ['150 g apple gourd (tinda)', 'apple gourd'],
  'Cabbage Sabzi': ['150 g cabbage', 'cabbage'],
  'Cauliflower Curry': ['150 g cauliflower florets', 'cauliflower'],
  'Beans Poriyal': ['150 g green beans', 'green beans'],
  'Carrot Peas Curry': ['100 g carrot\n50 g green peas', 'carrot and green peas'],
  'Karela Sabzi': ['150 g bitter gourd (karela)', 'bitter gourd'],
  'Pumpkin Curry': ['150 g pumpkin', 'pumpkin'],
  'Ridge Gourd Curry': ['150 g ridge gourd', 'ridge gourd'],
  'Broccoli Masala': ['150 g broccoli florets', 'broccoli'],
  'Zucchini Sabzi': ['150 g zucchini', 'zucchini'],
  'Aloo Gobi Light': ['75 g potato\n75 g cauliflower florets', 'potato and cauliflower'],
  'Palak Corn': ['100 g spinach\n50 g sweet corn', 'spinach and sweet corn'],
  'Methi Sabzi': ['120 g fresh fenugreek leaves\n30 g green peas', 'fenugreek leaves and green peas'],
  'Capsicum Curry': ['150 g capsicum', 'capsicum'],
  'Mushroom Masala': ['150 g mushrooms', 'mushrooms'],
  'Baby Corn Curry': ['150 g baby corn', 'baby corn'],
  'Sprouts Curry': ['150 g mixed bean sprouts', 'mixed bean sprouts'],
  'Soyabean Curry': ['150 g cooked soybeans', 'cooked soybeans'],
  'Torai Curry': ['150 g ridge gourd (torai)', 'ridge gourd'],
  'Chayote Sabzi': ['150 g chayote squash', 'chayote squash'],
  'Beetroot Sabzi': ['150 g beetroot', 'beetroot'],
};

function sabziIngredients(title) {
  return SABZI_INGREDIENTS[title] ?? [`150 g mixed vegetables for ${title.toLowerCase()}`, 'mixed vegetables'];
}

function khichdiIngs(title) {
  const base = `80 g mixed vegetables (carrot, beans, peas)
1 tsp oil
1/2 tsp cumin seeds
1/4 tsp turmeric
1/2 tsp salt
2 tbsp cucumber salad`;
  if (title.includes('Oats')) return `40 g rolled oats\n30 g moong dal\n${base}`;
  if (title.includes('Quinoa')) return `40 g quinoa\n30 g moong dal\n${base}`;
  if (title.includes('Bajra')) return `40 g bajra\n30 g moong dal\n${base}`;
  if (title.includes('Jowar')) return `40 g jowar\n30 g moong dal\n${base}`;
  if (title.includes('Masoor')) return `30 g rice\n30 g masoor dal\n${base}`;
  if (title.includes('Mix')) return `30 g rice\n15 g moong dal\n15 g masoor dal\n${base}`;
  if (title.includes('Palak')) return `30 g rice\n30 g moong dal\n60 g spinach, chopped\n${base}`;
  if (title.includes('Tomato')) return `30 g rice\n30 g moong dal\n80 g tomato, chopped\n${base}`;
  if (title.includes('Lauki')) return `30 g rice\n30 g moong dal\n80 g lauki, diced\n${base}`;
  if (title.includes('Sprouted')) return `30 g rice\n60 g sprouted moong\n${base}`;
  if (title.includes('Carrot')) return `30 g rice\n30 g moong dal\n50 g carrot, diced\n40 g green peas\n${base}`;
  if (title.includes('Mushroom')) return `30 g rice\n30 g moong dal\n80 g mushrooms, sliced\n${base}`;
  return `30 g rice\n30 g moong dal\n${base}`;
}

function southIngs(title) {
  if (title.includes('Avial')) {
    return `50 g brown rice, dry\n150 g mixed vegetables (ash gourd, beans, carrot)\n2 tbsp grated coconut\n1 tsp coconut oil\n1/4 tsp turmeric`;
  }
  if (title.includes('Cabbage Poriyal')) {
    return `50 g millet, dry\n120 g cabbage, shredded\n1 tsp oil\n1/4 tsp mustard seeds\n1 tsp grated coconut`;
  }
  if (title.includes('Keerai Kootu')) {
    return `50 g brown rice, dry\n80 g spinach\n30 g moong dal\n1 tsp oil\n1/4 tsp turmeric`;
  }
  if (title.includes('Vegetable Sambar')) {
    return `50 g millet, dry\n1 katori (120 g) vegetable sambar\n40 g beans poriyal`;
  }
  if (title.includes('Lemon Rasam')) {
    return `50 g brown rice, dry\n1 katori (150 ml) lemon rasam\n40 g cabbage poriyal`;
  }
  if (title.includes('Tomato Rasam')) {
    return `50 g millet, dry\n1 katori (150 ml) tomato rasam\n40 g beans poriyal`;
  }
  if (title.includes('Beans Poriyal')) {
    return `50 g brown rice, dry\n120 g beans, chopped\n1 tsp oil\n1 tsp grated coconut`;
  }
  return `50 g millet, dry\n120 g ash gourd\n30 g moong dal\n1 tsp oil\n1/4 tsp turmeric`;
}

function bowlIngs(title) {
  if (title.includes('Tofu Millet')) return `50 g cooked millet\n80 g tofu\n1 cup mixed vegetables (80 g)\n1 tsp oil\n1 tsp lemon juice`;
  if (title.includes('Chickpea Quinoa')) return `50 g cooked quinoa\n80 g boiled chickpeas\n1 cup mixed vegetables (80 g)\n1 tsp oil`;
  if (title.includes('Sprouts Brown Rice')) return `50 g cooked brown rice\n80 g mixed sprouts\n1 cup salad vegetables (80 g)\n1 tsp lemon juice`;
  if (title.includes('Paneer Millet')) return `50 g cooked millet\n80 g paneer\n1 cup mixed vegetables (80 g)\n1 tsp oil`;
  if (title.includes('Rajma Quinoa')) return `50 g cooked quinoa\n80 g cooked rajma\n1 cup mixed vegetables (80 g)\n1 tsp oil`;
  if (title.includes('Grilled Vegetable')) return `50 g cooked millet\n150 g grilled mixed vegetables\n1 tsp oil\n1 tsp lemon juice`;
  if (title.includes('Palak Tofu')) return `50 g cooked brown rice\n80 g tofu\n80 g spinach\n1 tsp oil`;
  if (title.includes('Corn Bean')) return `50 g cooked millet\n40 g boiled corn\n60 g cooked beans\n1 cup vegetables (80 g)\n1 tsp oil`;
  if (title.includes('Mushroom Quinoa')) return `50 g cooked quinoa\n80 g mushrooms\n1 cup vegetables (80 g)\n1 tsp oil`;
  if (title.includes('Beetroot Hummus')) return `50 g cooked millet\n80 g beetroot, diced\n2 tbsp hummus (30 g)\n1 cup salad vegetables (80 g)`;
  if (title.includes('Cucumber Raita')) return `50 g cooked brown rice\n100 g cucumber raita (80 g curd + 20 g cucumber)\n1 cup salad vegetables (80 g)`;
  return `50 g cooked millet\n80 g cooked kala chana\n1 cup mixed vegetables (80 g)\n1 tsp oil`;
}

function soupIngs(title) {
  const toast = `1 slice whole-wheat bread (30 g), toasted
1 tsp oil
1/2 tsp minced ginger
1 clove garlic, minced
400 ml water or stock`;
  if (title.includes('Chicken')) return `80 g boneless chicken, diced\n150 g mixed vegetables\n${toast}`;
  if (title.includes('Moong') || title.includes('Lentil') || title.includes('Mulligatawny')) {
    return `30 g moong dal\n150 g mixed vegetables\n${toast}`;
  }
  if (title.includes('Sweet Corn')) return `80 g sweet corn\n100 g mixed vegetables\n${toast}`;
  if (title.includes('Lemon Coriander')) {
    return `150 g mixed vegetables\n10 g fresh coriander\n1 tbsp lemon juice\n40 g onion, chopped\n${toast}`;
  }
  if (title.includes('Clear Vegetable')) {
    return `200 g mixed vegetables (carrot, cabbage, beans)\n40 g onion, chopped\n${toast}`;
  }
  if (title.includes('Garlic Rasam')) {
    return `180 g tomato, chopped\n2 garlic cloves, crushed\n1/2 tsp rasam powder\n40 g onion, chopped\n${toast}`;
  }
  if (title.includes('Hot and Sour')) {
    return `200 g mixed vegetables (cabbage, carrot, mushroom)\n1 tsp low-sodium soy sauce\n1 tsp rice vinegar\n40 g onion, chopped\n${toast}`;
  }
  const vegetables = {
    Tomato: '200 g tomato',
    Palak: '200 g spinach',
    Broccoli: '200 g broccoli',
    Mushroom: '200 g mushrooms',
    Beetroot: '200 g beetroot',
    Carrot: '200 g carrot',
    Lauki: '200 g bottle gourd',
    Pumpkin: '200 g pumpkin',
    Cauliflower: '200 g cauliflower',
  };
  const line = Object.entries(vegetables).find(([keyword]) => title.includes(keyword))?.[1];
  return `${line ?? '200 g mixed vegetables'}\n40 g onion, chopped\n${toast}`;
}

function saladIngs(title) {
  const base = `1 cup cucumber-tomato-onion salad (80 g)
1 tsp lemon juice
1/4 tsp salt
1/2 tsp chaat masala`;
  if (title.includes('Paneer')) return `80 g paneer cubes\n${base}`;
  if (title.includes('Tofu')) return `80 g tofu cubes\n1 tsp sesame seeds\n${base}`;
  if (title.includes('Chicken')) return `100 g grilled chicken\n${base}`;
  if (title.includes('Egg')) return `2 boiled eggs\n${base}`;
  if (title.includes('Fish')) return `100 g grilled fish\n${base}`;
  if (title.includes('Kala Chana')) return `80 g cooked kala chana\n${base}`;
  if (title.includes('Chickpea') || title.includes('Palak Chana')) return `80 g cooked chickpeas\n${base}`;
  if (title.includes('Rajma')) return `80 g cooked rajma\n40 g boiled corn\n${base}`;
  if (title.includes('Quinoa')) return `50 g cooked quinoa\n${base}`;
  if (title.includes('Feta')) return `150 g watermelon cubes\n20 g feta\n${base}`;
  if (title.includes('Sprout')) return `80 g mixed sprouts\n${base}`;
  if (title.includes('Beetroot')) return `80 g beetroot, boiled and diced\n60 g orange segments\n${base}`;
  if (title.includes('Corn Tomato')) return `80 g boiled corn\n80 g tomato, chopped\n${base}`;
  if (title.includes('Mushroom')) return `80 g mushrooms\n40 g spinach\n${base}`;
  return `80 g mixed sprouts\n${base}`;
}

function saladSteps(title) {
  const t = title.toLowerCase();
  let proteinStep = 'Rinse and drain the listed cooked beans, sprouts or grain.';
  if (t.includes('chicken')) {
    proteinStep = 'Coat the chicken with lemon and pepper, then grill 6–7 minutes per side until the centre reaches 74°C.';
  } else if (t.includes('fish')) {
    proteinStep = 'Coat the fish with lemon and pepper, then grill 5–6 minutes per side until it flakes and is opaque.';
  } else if (t.includes('egg')) {
    proteinStep = 'Boil the eggs for 10 minutes, cool, peel and quarter them.';
  } else if (t.includes('paneer') || t.includes('tofu')) {
    proteinStep = `Pat the ${t.includes('paneer') ? 'paneer' : 'tofu'} dry and sear it in a non-stick pan for 2 minutes per side.`;
  } else if (t.includes('mushroom')) {
    proteinStep = 'Slice the mushrooms and cook them in a dry non-stick pan for 5 minutes; cool before adding.';
  }
  return `Wash and chop every listed vegetable into bite-size pieces.
${proteinStep}
Whisk the measured lemon juice, salt and chaat masala into a dressing.
Combine everything immediately before eating and serve one large bowl.`;
}

function dinnerSteps(title) {
  const t = title.toLowerCase();
  if (t.includes('wrap')) {
    return `Cook the listed filling and vegetables in a non-stick pan until tender; cook chicken or egg completely through.
Warm the whole-wheat wrap for 20 seconds per side without adding oil.
Spread the filling down the centre, add the measured salad, fold the sides in and roll tightly.
Serve one wrap as the complete dinner.`;
  }
  if (t.includes('khichdi')) {
    return `Rinse the rice and moong dal until the water runs clear.
Cook them with the measured vegetables, 300 ml water and a pinch of turmeric until soft, about 15–18 minutes.
Stir once, rest 3 minutes and serve one small bowl with the listed salad.`;
  }
  if (t.includes('stir fry')) {
    return `Cut the protein and vegetables into even bite-size pieces.
Heat the measured 1 tsp oil in a wide pan. Cook the protein completely, then add vegetables and stir-fry 5–6 minutes until crisp-tender.
Warm the listed rotis or rice separately and plate them with the stir-fry.
Serve only the listed dinner portion.`;
  }
  if (t.includes('tikka') || t.includes('tandoori') || t.includes('grilled')) {
    return `Coat the listed protein with lemon, ginger, chilli and a pinch of salt; rest 15 minutes.
Grill or bake until browned and cooked through: paneer 8–10 minutes, chicken 16–18 minutes, or fish 10–12 minutes.
Prepare the measured salad and grain or phulka, if listed.
Plate everything together without extra oil or fried sides.`;
  }
  if (t.includes('curry') || t.includes('masala') || t.includes('palak')) {
    return `Heat 1 tsp oil. Cook 40 g onion and 50 g tomato with ginger, turmeric and coriander powder until the masala thickens.
Add the listed protein or vegetable and 100 ml water. Cover and simmer until tender and completely cooked.
Warm the two phulkas separately on a dry tawa.
Serve one measured katori of curry with the phulkas and listed salad.`;
  }
  if (t.includes('oats')) {
    return `Heat 1 tsp oil and sauté the measured vegetables for 4 minutes.
Add the oats and 200 ml water. Simmer 6–8 minutes, stirring, until savoury and creamy.
Season lightly and serve one measured bowl as dinner.`;
  }
  return `Measure every listed ingredient before cooking.
Cook the vegetables and protein with no more than 1 tsp oil until tender and completely cooked.
Add the listed bread, grain and salad, then serve one measured plate.`;
}

function roastedSnackSteps(title) {
  if (title.includes('Air Fried')) {
    return `Toss the measured sweet-potato cubes with 1 tsp oil and the listed spices.
Air-fry at 190°C for 12–15 minutes, shaking once, until browned and tender.
Finish with lemon and serve the measured portion in a bowl.`;
  }
  if (title.includes('Corn')) {
    return `Boil or steam the measured corn for 5 minutes and drain well.
Mix with the listed onion, spices and lemon.
Serve one small bowl while warm.`;
  }
  if (/Bhel|Khakra|Murmura/i.test(title)) {
    return `Measure every ingredient before mixing.
Combine the puffed grain or broken khakra with the listed vegetables, spices and lemon.
Toss once and eat immediately so it stays crisp. Do not add extra sev.`;
  }
  return `Measure the listed nuts, seeds, pulses or puffs into a dry pan.
Toast on medium-low for 3–5 minutes, stirring, until crisp and fragrant; do not burn.
Turn off the heat, add the listed spices and lemon, and serve one small bowl.`;
}

function nutSnackSteps(title) {
  if (/Trail Mix/i.test(title)) {
    return `Weigh each listed nut, seed, pulse and dried-fruit ingredient.
Mix them in a small bowl without adding oil, salt or sugar.
Serve exactly 25 g and store the remainder in an airtight container.`;
  }
  if (/Chikki/i.test(title)) {
    return `Dry-roast the measured peanuts for 3 minutes.
Melt the measured jaggery with 1 tsp water on low heat, then stir in the peanuts.
Press into a thin layer between baking paper, cool completely and cut into two small pieces.`;
  }
  return `Dry-roast any flour or oats listed for 3–4 minutes on low heat.
Pulse the measured dates or jaggery with the nuts, then combine with the roasted ingredient and measured ghee.
Divide and roll into two equal small bites. Chill 15 minutes before serving.`;
}

function dinnerPlateIngs(title) {
  const map = {
    'Paneer Tikka with Salad': `80 g paneer tikka\n1 cup salad (80 g)\n2 tbsp mint chutney\n1 whole-wheat phulka (30 g flour)`,
    'Chicken Tikka with Salad': `120 g chicken tikka\n1 cup salad (80 g)\n2 tbsp mint chutney`,
    'Tandoori Fish with Salad': `120 g tandoori fish\n1 cup salad (80 g)\n1 tsp lemon juice`,
    'Grilled Paneer with Millet': `80 g grilled paneer\n3/4 cup cooked millet (40 g dry)\n1 cup salad (80 g)`,
    'Tofu Stir Fry Dinner': `100 g tofu\n120 g mixed vegetables\n1 tsp oil\n1/2 cup cooked brown rice (25 g dry)`,
    'Mixed Vegetable Stir Fry with Roti': `150 g mixed vegetable stir fry\n2 whole-wheat phulkas (30 g flour each)\n1 tsp oil`,
    'Chicken Stir Fry with Roti': `120 g chicken stir fry\n2 whole-wheat phulkas (30 g flour each)\n1 tsp oil`,
    'Egg Curry with Phulkas': `2 eggs in 120 g curry\n2 whole-wheat phulkas (30 g flour each)\n1 cup salad (80 g)`,
    'Chicken Curry with Phulkas': `1 katori (120 g) chicken curry\n2 whole-wheat phulkas (30 g flour each)\n1 cup salad (80 g)`,
    'Fish Curry with Phulkas': `1 katori (120 g) fish curry\n2 whole-wheat phulkas (30 g flour each)`,
    'Palak Paneer with Phulkas': `1 katori (120 g) palak paneer\n2 whole-wheat phulkas (30 g flour each)`,
    'Mushroom Masala with Phulkas': `1 katori (120 g) mushroom masala\n2 whole-wheat phulkas (30 g flour each)`,
    'Veg Wrap Dinner': `1 whole-wheat wrap (40 g)\n100 g grilled vegetables\n2 tbsp hummus (30 g)`,
    'Chicken Wrap Dinner': `1 whole-wheat wrap (40 g)\n80 g cooked chicken\n1 cup salad (80 g)`,
    'Paneer Wrap Dinner': `1 whole-wheat wrap (40 g)\n60 g paneer\n1 cup salad (80 g)`,
    'Egg Wrap Dinner': `1 whole-wheat wrap (40 g)\n2-egg bhurji\n1 cup salad (80 g)`,
    'Tofu Wrap Dinner': `1 whole-wheat wrap (40 g)\n80 g tofu\n80 g vegetables`,
    'Light Moong Khichdi Dinner': `30 g moong dal\n20 g rice\n1 cup vegetables (80 g)\n2 tbsp salad`,
    'Oats Vegetable Dinner Bowl': `40 g rolled oats\n100 g mixed vegetables\n1 tsp oil`,
    'Grilled Fish with Vegetables': `120 g grilled fish\n150 g steamed vegetables\n1 tsp lemon juice`,
  };
  return map[title];
}

function roastedSnackIngs(title) {
  const spice = `1/4 tsp chaat masala
1/4 tsp chilli powder
1 tsp lemon juice`;
  const map = {
    'Roasted Chana Masala': `35 g roasted chana\n${spice}`,
    'Roasted Peanuts Light': `30 g roasted peanuts\n${spice}`,
    'Roasted Soy Nuts': `30 g roasted soy nuts\n${spice}`,
    'Roasted Pumpkin Seeds': `25 g roasted pumpkin seeds\n${spice}`,
    'Roasted Sunflower Seeds': `25 g roasted sunflower seeds\n${spice}`,
    'Masala Corn Cup': `80 g boiled sweet corn\n${spice}\n5 g onion, chopped`,
    'Roasted Jowar Puff': `25 g jowar puffs\n${spice}`,
    'Roasted Bajra Puff': `25 g bajra puffs\n${spice}`,
    'Bhel Puffed Rice Light': `20 g puffed rice\n30 g chopped onion and tomato\n1 tsp lemon juice\n1 tsp sev`,
    'Khakra Chaat Light': `1 khakra (15 g)\n40 g chopped tomato and onion\n1 tsp lemon juice`,
    'Roasted Makhana Peri Peri': `25 g roasted makhana\n1/4 tsp peri peri masala`,
    'Roasted Makhana Turmeric': `25 g roasted makhana\n1/4 tsp turmeric\n1/4 tsp salt`,
    'Air Fried Sweet Potato Chaat': `80 g sweet potato cubes\n1 tsp oil\n${spice}`,
    'Roasted Chana Jor Garam Light': `35 g roasted chana\n${spice}`,
    'Murmura Chaat Light': `20 g murmura\n30 g onion and tomato\n1 tsp lemon juice`,
    'Roasted Flax Crackers': `4 flax crackers (20 g)\n2 tbsp salsa (30 g)`,
  };
  return map[title] ?? `30 g ${title.toLowerCase()}\n${spice}`;
}

function chaatIngs(title) {
  const spice = `1 tsp lemon juice\n1/2 tsp chaat masala\n5 g coriander leaves\n1 green chilli, chopped`;
  const map = {
    'Sprouts Chaat': `80 g mixed sprouts\n${spice}`,
    'Moong Chaat': `80 g boiled moong\n${spice}`,
    'Chana Chaat': `80 g boiled chickpeas\n${spice}`,
    'Kala Chana Chaat': `80 g boiled kala chana\n${spice}`,
    'Corn Anar Chaat': `60 g boiled corn\n40 g pomegranate arils\n${spice}`,
    'Cucumber Chaat': `100 g cucumber, diced\n${spice}`,
    'Tomato Onion Chaat': `60 g tomato\n40 g onion\n${spice}`,
    'Beetroot Chaat': `80 g boiled beetroot, diced\n${spice}`,
    'Papdi Chaat Light': `4 papdis (16 g)\n40 g boiled potato\n2 tbsp low-fat curd\n1 tsp sev`,
    'Dahi Puri Light': `4 mini puris (16 g)\n40 g boiled potato\n3 tbsp low-fat curd (45 g)\n1 tsp sev`,
    'Fruit Chaat Masala': `120 g mixed fruit\n${spice}`,
    'Watermelon Chaat': `150 g watermelon cubes\n${spice}`,
    'Papaya Chaat': `120 g papaya cubes\n${spice}`,
    'Guava Chaat': `120 g guava, diced\n${spice}`,
    'Apple Chaat': `120 g apple, diced\n${spice}`,
    'Pineapple Chaat': `120 g pineapple cubes\n${spice}`,
    'Mango Chaat Light': `120 g mango cubes\n${spice}`,
    'Pear Walnut Chaat': `120 g pear, diced\n8 g walnuts (3 halves)\n${spice}`,
  };
  return map[title] ?? `120 g chopped fruit\n${spice}`;
}

function yogurtIngs(title) {
  const map = {
    'Greek Yogurt with Berries': `150 g low-fat Greek yogurt\n60 g mixed berries`,
    'Hung Curd with Cucumber': `120 g hung curd\n40 g cucumber, grated\n1/4 tsp roasted cumin\n1/4 tsp salt`,
    'Low Fat Curd with Flax': `150 g low-fat curd\n1 tsp flaxseed (4 g)`,
    'Raita Cucumber Cup': `150 g low-fat curd\n40 g cucumber, grated\n1/4 tsp roasted cumin`,
    'Raita Boondi Light': `150 g low-fat curd\n10 g baked boondi\n1/4 tsp roasted cumin`,
    'Mishti Doi Light': `140 g plain low-fat yogurt\n10 g date paste\n1 pinch cardamom`,
    'Yogurt with Pomegranate': `150 g low-fat yogurt\n40 g pomegranate arils`,
    'Yogurt with Papaya': `150 g low-fat yogurt\n60 g papaya cubes`,
    'Yogurt with Apple Cinnamon': `150 g low-fat yogurt\n60 g apple, diced\n1/8 tsp cinnamon`,
    'Yogurt with Roasted Chana': `150 g low-fat yogurt\n15 g roasted chana`,
  };
  return map[title] ?? `150 g low-fat yogurt`;
}

function fruitSnackIngs(title) {
  const map = {
    'Apple Walnut Cup': `120 g apple, diced\n8 g walnuts (3 halves)`,
    'Papaya Lime Bowl': `150 g papaya cubes\n1 tsp lime juice`,
    'Guava Chaat Cup': `120 g guava, diced\n1/2 tsp chaat masala\n1 tsp lemon juice`,
    'Orange Segments': `180 g orange segments (1 medium orange)`,
    'Muskmelon Bowl': `150 g muskmelon cubes`,
    'Watermelon Mint Bowl': `150 g watermelon cubes\n4 mint leaves`,
    'Pomegranate Cup': `100 g pomegranate arils`,
    'Pear Cinnamon Cup': `120 g pear, diced\n1/8 tsp cinnamon`,
    'Kiwi Bowl': `120 g kiwi, sliced (2 small)`,
    'Mixed Fruit Cup': `150 g mixed fruit (apple, papaya, pomegranate)`,
    'Stewed Apple Cinnamon': `120 g apple, stewed\n1/8 tsp cinnamon\n2 tbsp water`,
    'Banana with Peanut Butter': `1 small banana (90 g)\n1 tsp peanut butter (8 g)`,
    'Dates Almond Pair': `2 dates (16 g)\n6 almonds (8 g)`,
    'Fig Walnut Pair': `2 dried figs (16 g)\n6 g walnuts (2 halves)`,
  };
  return map[title] ?? `120 g fruit`;
}

function nutBiteIngs(title) {
  const map = {
    'Almond Date Energy Bites': `20 g pitted dates\n15 g almonds\n1/2 tsp ghee (optional)`,
    'Walnut Date Energy Bites': `20 g pitted dates\n15 g walnuts\n1/2 tsp ghee (optional)`,
    'Peanut Chikki Light': `20 g roasted peanuts\n10 g jaggery`,
    'Mixed Seeds Trail Mix': `10 g pumpkin seeds\n8 g sunflower seeds\n7 g flaxseed`,
    'Roasted Chana Trail Mix': `20 g roasted chana\n5 g raisins`,
    'Coconut Almond Bites': `15 g almonds\n8 g desiccated coconut\n15 g dates`,
    'Ragi Ladoo Light': `20 g ragi flour\n8 g jaggery\n1/2 tsp ghee`,
    'Besan Ladoo Light': `20 g roasted besan\n8 g jaggery\n1/2 tsp ghee`,
    'Oats Ladoo Light': `20 g oats powder\n10 g dates\n1/2 tsp ghee`,
    'Makhana Trail Mix': `15 g roasted makhana\n8 g almonds\n5 g raisins`,
  };
  return map[title] ?? `20 g dates\n15 g mixed nuts`;
}

function sundalIngs(title) {
  const tadka = `1 tsp oil\n1/4 tsp mustard seeds\n4 curry leaves\n1 green chilli, chopped\n1 tsp grated coconut\n1 tsp lemon juice`;
  const map = {
    'Chana Sundal': `80 g boiled chickpeas\n${tadka}`,
    'Moong Sundal': `80 g boiled moong\n${tadka}`,
    'Peanut Sundal': `40 g boiled peanuts\n${tadka}`,
    'Corn Sundal': `80 g boiled corn\n${tadka}`,
    'Mixed Sprouts Sundal': `80 g mixed sprouts\n${tadka}`,
    'Kala Chana Sundal': `80 g boiled kala chana\n${tadka}`,
    'Green Peas Sundal': `80 g boiled green peas\n${tadka}`,
    'Soybean Sundal': `80 g boiled soybeans\n${tadka}`,
    'Rajma Sundal': `80 g boiled rajma\n${tadka}`,
    'Lobia Sundal': `80 g boiled lobia\n${tadka}`,
    'Masala Sprouts Cup': `80 g mixed sprouts\n${tadka}`,
    'Steamed Corn Sundal': `80 g steamed corn\n${tadka}`,
    'Carrot Moong Sundal': `40 g grated carrot\n50 g boiled moong\n${tadka}`,
    'Coconut Chana Sundal': `80 g boiled chickpeas\n2 tsp grated coconut\n${tadka}`,
  };
  return map[title] ?? `80 g boiled legumes\n${tadka}`;
}

function steamedSnackIngs(title) {
  const chutney = `2 tbsp mint or coconut chutney (30 g)`;
  const map = {
    'Steamed Idli Snack': `2 idlis (60 g)\n${chutney}`,
    'Mini Rava Idli Snack': `3 mini rava idlis (60 g)\n${chutney}`,
    'Vegetable Dhokla Snack': `2 pieces vegetable dhokla (60 g)\n${chutney}`,
    'Kothimbir Vadi Light': `2 pieces steamed kothimbir vadi (50 g)\n${chutney}`,
    'Patra Light': `2 pieces steamed patra (50 g)\n${chutney}`,
    'Steamed Corn on Cob': `1 small corn cob (120 g)\n1/4 tsp chaat masala\n1 tsp lemon juice`,
    'Vegetable Momos Steam': `4 steamed vegetable momos (80 g)\n2 tbsp chutney (30 g)`,
    'Oats Idli Snack': `2 oats idlis (60 g)\n${chutney}`,
    'Ragi Idli Snack': `2 ragi idlis (60 g)\n${chutney}`,
    'Sandwich Dhokla Snack': `2 pieces sandwich dhokla (60 g)\n${chutney}`,
  };
  return map[title] ?? `2 pieces (60 g)\n${chutney}`;
}

function eggSnackIngs(title) {
  const map = {
    'Boiled Egg Chaat': `2 boiled eggs\n1/2 tsp chaat masala\n1 tsp lemon juice\n5 g onion, chopped`,
    'Egg White Cup': `3 egg whites, scrambled\n20 g tomato, chopped\n1/4 tsp salt`,
    'Masala Boiled Eggs': `2 boiled eggs\n1/4 tsp chilli powder\n1/4 tsp chaat masala`,
    'Egg Open Sandwich': `1 boiled egg, sliced\n1 slice whole-wheat bread (30 g)\n10 g cucumber`,
    'Egg Bhurji Toast Snack': `2 eggs, scrambled\n1 slice whole-wheat toast (30 g)\n20 g onion`,
    'French Toast Light': `1 slice whole-wheat bread (30 g)\n1 egg\n30 ml low-fat milk\n1/4 tsp cinnamon`,
    'Egg Muffin Vegetable': `2 eggs\n40 g mixed vegetables\n1 tsp oil`,
    'Egg Salad Lettuce Cups': `2 boiled eggs, chopped\n2 lettuce leaves\n1 tsp hung curd\n1/4 tsp black pepper`,
  };
  return map[title] ?? `2 eggs`;
}

function sandwichIngs(title) {
  const bread = `2 small slices whole-wheat bread (40 g total)`;
  const map = {
    'Cucumber Mint Sandwich': `${bread}\n40 g cucumber, sliced\n2 tbsp mint chutney (20 g)`,
    'Tomato Cheese Light Sandwich': `${bread}\n40 g tomato, sliced\n15 g low-fat cheese`,
    'Hummus Vegetable Sandwich': `${bread}\n2 tbsp hummus (30 g)\n30 g cucumber and carrot`,
    'Paneer Sandwich Snack': `${bread}\n40 g crumbled paneer\n2 tbsp mint chutney (20 g)`,
    'Tofu Sandwich Snack': `${bread}\n40 g crumbled tofu\n20 g tomato`,
    'Corn Spinach Sandwich': `${bread}\n30 g boiled corn\n20 g spinach, sautéed`,
    'Chicken Open Sandwich': `1 slice whole-wheat bread (30 g)\n50 g shredded chicken\n10 g lettuce`,
    'Egg Chutney Sandwich': `${bread}\n1 boiled egg, sliced\n2 tbsp mint chutney (20 g)`,
  };
  return map[title] ?? `${bread}\n40 g filling`;
}

function extraBreakfastIngs(title) {
  const map = {
    'Pesarattu with Chutney': `80 g green moong batter (from 40 g dry moong)\n5 g ginger\n1 green chilli\n1 tsp oil\n2 tbsp coconut chutney\n1 katori (120 g) sambar`,
    'Rava Idli with Sambar': `60 g rava idli batter\n30 g mixed vegetables\n3 rava idlis\n1 katori (120 g) sambar\n2 tbsp coconut chutney`,
    'Set Dosa with Sambar': `100 g thick dosa batter\n1 tsp oil\n1 katori (120 g) sambar\n2 tbsp coconut chutney`,
    'Appam with Vegetable Stew': `2 appams (80 g batter total)\n120 g mixed vegetable stew\n1 tsp coconut oil`,
    'Puttu with Kadala': `50 g ragi or rice puttu flour\n1 katori (120 g) kadala curry\n1 tsp grated coconut`,
    'Idiyappam with Vegetable Stew': `2 idiyappam nests (60 g)\n120 g mixed vegetable stew`,
    'Adai with Avial': `80 g lentil-rice adai batter\n1 tsp oil\n1 katori (120 g) avial`,
    'Ven Pongal Light': `40 g rice\n20 g moong dal\n1/2 tsp cumin\n1/4 tsp pepper\n1 tsp ghee\n1 katori (120 g) sambar`,
    'Millet Pongal': `40 g millet\n20 g moong dal\n1/2 tsp cumin\n1/4 tsp pepper\n1 tsp oil\n2 tbsp coconut chutney`,
    'Sabudana Khichdi Light': `40 g soaked sabudana\n15 g roasted peanuts\n40 g potato, diced\n1 tsp oil\n1 tsp lemon juice`,
    'Thalipeeth with Thecha': `60 g multigrain flour\n30 g onion, chopped\n1 tsp oil\n2 tbsp green thecha`,
    'Akki Roti with Chutney': `60 g rice flour\n40 g mixed vegetables\n1 tsp oil\n2 tbsp coconut chutney`,
    'Ragi Mudde with Sambar': `50 g ragi flour (1 mudde)\n1 katori (120 g) sambar\n40 g vegetable palya`,
    'Jowar Bhakri with Thecha': `60 g jowar flour (2 bhakris)\n2 tbsp green thecha\n40 g onion salad`,
    'Bajra Rotla with Kadhi': `60 g bajra flour (2 rotlas)\n1 katori (120 g) thin kadhi\n40 g salad`,
    'Handvo Light': `60 g mixed lentil-rice batter\n40 g mixed vegetables\n1 tsp oil\n2 tbsp chutney`,
    'Khaman Dhokla Plate': `3 pieces khaman (60 g)\n2 tbsp green chutney\n1 tsp oil tempering`,
    'Moong Dal Cheela Masala': `40 g moong dal batter\n30 g onion-tomato\n1 tsp oil\n2 tbsp chutney`,
    'Paneer Bhurji with Phulkas': `80 g paneer, crumbled\n40 g onion-tomato masala\n2 whole-wheat phulkas (30 g flour each)\n40 g salad`,
    'Tofu Bhurji with Phulkas': `80 g tofu, crumbled\n40 g onion-tomato masala\n2 whole-wheat phulkas (30 g flour each)\n40 g salad`,
    'Mushroom Bhurji with Phulkas': `100 g mushrooms, chopped\n40 g onion-tomato masala\n2 whole-wheat phulkas (30 g flour each)\n40 g salad`,
    'Masala Omelette with Toast': `2 egg whites + 1 yolk\n40 g mixed vegetables\n1 tsp oil\n1 slice whole-wheat toast (30 g)`,
    'Egg White Bhurji with Phulkas': `3 egg whites\n40 g mixed vegetables\n2 whole-wheat phulkas (30 g flour each)`,
    'Egg Dosa with Chutney': `60 g dosa batter\n1 egg\n2 tbsp coconut chutney\n1 katori (120 g) sambar`,
    'Boiled Eggs with Millet Upma': `2 boiled eggs\n1 bowl millet upma (40 g dry millet)\n40 g salad`,
  };
  return map[title];
}

function drinkIngs(title) {
  const map = {
    'Cucumber Mint Chaas': `100 g cucumber\n200 ml buttermilk\n8 mint leaves\n1/4 tsp roasted cumin\n1/4 tsp salt`,
    'Jeera Chaas': `200 ml buttermilk\n1/2 tsp roasted cumin\n2 g ginger\n1/4 tsp salt`,
    'Beetroot Chaas': `40 g beetroot, chopped\n200 ml buttermilk\n1/4 tsp cumin\n1/4 tsp salt`,
    'Tomato Chaas': `80 g tomato\n200 ml buttermilk\n5 g coriander\n1/4 tsp salt`,
    'Pudina Chaas': `200 ml buttermilk\n10 mint leaves\n1 green chilli\n1/4 tsp cumin\n1/4 tsp salt`,
    'Light Aam Panna': `80 g raw mango pulp\n8 mint leaves\n1/4 tsp roasted cumin\n250 ml water`,
    'Kokum Sharbat Light': `4 kokum petals\n250 ml water\n6 mint leaves\n1/4 tsp cumin`,
    'Jaljeera Cooler': `250 ml water\n1/2 tsp jaljeera powder\n6 mint leaves\n1 tsp lemon juice`,
    'Lemon Mint Infusion': `250 ml water\n1 tsp lemon juice\n8 mint leaves\n1/4 tsp black salt`,
    'Turmeric Golden Milk': `200 ml low-fat milk\n1/4 tsp turmeric\n1 pinch black pepper`,
    'Light Badam Milk': `200 ml low-fat milk\n6 soaked almonds (8 g)\n1 pinch cardamom`,
    'Saffron Milk Light': `200 ml low-fat milk\n4 saffron strands\n2 almonds (3 g)`,
    'Rose Lassi Light': `150 g low-fat yogurt\n50 ml water\n1 tsp rose water`,
    'Salted Lassi Light': `150 g low-fat yogurt\n50 ml water\n1/4 tsp roasted cumin\n1/4 tsp salt`,
    'Cucumber Coconut Cooler': `100 g cucumber\n200 ml coconut water\n8 mint leaves\n1 tsp lemon juice`,
    'Tomato Mint Cooler': `80 g tomato\n8 mint leaves\n1 tsp lemon juice\n200 ml water\n1/4 tsp cumin`,
  };
  return map[title];
}

const SMOOTHIE_FRUITS = [
  'Banana',
  'Mango',
  'Papaya',
  'Pineapple',
  'Apple',
  'Orange',
  'Watermelon',
  'Pomegranate',
  'Muskmelon',
  'Guava',
  'Chikoo',
  'Kiwi',
  'Peach',
  'Strawberry',
  'Mixed Berry',
  'Grapes',
  'Pear',
  'Lychee',
  'Fig',
  'Plum',
  'Coconut',
  'Dates',
  'Jamun',
  'Custard Apple',
];

function smoothieFruitProfile(fruit) {
  if (fruit === 'Dates') {
    return { line: '30 g pitted dates', kcal: -20, carbs: -4, sugar: 5, fat: 0, fiber: 0 };
  }
  if (fruit === 'Coconut') {
    return {
      line: '40 g fresh coconut meat',
      kcal: 40,
      carbs: -18,
      sugar: -12,
      fat: 12,
      fiber: 1,
    };
  }
  if (/Watermelon|Strawberry|Mixed Berry|Papaya|Peach|Muskmelon|Plum|Jamun/.test(fruit)) {
    return {
      line: `120 g ${fruit.toLowerCase()}`,
      kcal: -35,
      carbs: -8,
      sugar: -5,
      fat: 0,
      fiber: 1,
    };
  }
  if (/Apple|Orange|Pineapple|Guava|Kiwi|Pear|Lychee|Fig/.test(fruit)) {
    return {
      line: `120 g ${fruit.toLowerCase()}`,
      kcal: -20,
      carbs: -4,
      sugar: -2,
      fat: 0,
      fiber: 0,
    };
  }
  return {
    line: `120 g ${fruit.toLowerCase()}`,
    kcal: 0,
    carbs: 0,
    sugar: 0,
    fat: 0,
    fiber: 0,
  };
}

const SMOOTHIE_STYLES = [
  {
    name: 'Oats Smoothie',
    extra: 'oats and chia',
    liquid: '200 ml low-fat milk',
    ings: (fruit) => `120 g ${fruit.toLowerCase()}
40 g rolled oats
200 ml low-fat milk
1 tsp chia seeds
4 ice cubes (optional)`,
    kcal: 255,
    protein: 11,
    carbs: 42,
    fat: 6,
    fiber: 6,
    sugar: 17,
    allergens: 'Dairy, Gluten',
    dietType: 'Vegetarian',
    tags: vegTags([KD, HF]),
  },
  {
    name: 'Yogurt Smoothie',
    extra: 'hung curd',
    liquid: '150 g low-fat yogurt',
    ings: (fruit) => `120 g ${fruit.toLowerCase()}
150 g low-fat yogurt
50 ml water
4 almonds
4 ice cubes (optional)`,
    kcal: 230,
    protein: 12,
    carbs: 32,
    fat: 6,
    fiber: 4,
    sugar: 18,
    allergens: 'Dairy, Nuts',
    dietType: 'Vegetarian',
    tags: vegTags([HP, KD]),
  },
  {
    name: 'Almond Milk Smoothie',
    extra: 'unsweetened almond milk',
    liquid: '200 ml unsweetened almond milk',
    ings: (fruit) => `120 g ${fruit.toLowerCase()}
200 ml unsweetened almond milk
1 tsp flaxseed
4 ice cubes (optional)`,
    kcal: 190,
    protein: 5,
    carbs: 28,
    fat: 7,
    fiber: 5,
    sugar: 14,
    allergens: 'Nuts',
    dietType: 'Vegan',
    tags: veganTags([GF]),
  },
  {
    name: 'Chia Smoothie',
    extra: 'soaked chia',
    liquid: '200 ml low-fat milk',
    ings: (fruit) => `120 g ${fruit.toLowerCase()}
200 ml low-fat milk
2 tsp chia seeds, soaked 10 minutes
4 ice cubes (optional)`,
    kcal: 220,
    protein: 10,
    carbs: 30,
    fat: 7,
    fiber: 7,
    sugar: 16,
    allergens: 'Dairy',
    dietType: 'Vegetarian',
    tags: vegTags([HF, GF]),
  },
  {
    name: 'Protein Smoothie',
    extra: 'curd and soaked almonds',
    liquid: '150 g yogurt and 50 ml milk',
    ings: (fruit) => `120 g ${fruit.toLowerCase()}
150 g low-fat yogurt
50 ml low-fat milk
6 soaked almonds
4 ice cubes (optional)`,
    kcal: 280,
    protein: 15,
    carbs: 34,
    fat: 8,
    fiber: 4,
    sugar: 18,
    allergens: 'Dairy, Nuts',
    dietType: 'Vegetarian',
    tags: vegTags([HP, WG]),
  },
  {
    name: 'Mint Cooler',
    extra: 'fresh mint and lemon',
    liquid: '200 ml coconut water or chilled water',
    ings: (fruit) => `120 g ${fruit.toLowerCase()}
200 ml coconut water
8 mint leaves
1 tsp lemon juice
4 ice cubes (optional)`,
    kcal: 140,
    protein: 2,
    carbs: 32,
    fat: 1,
    fiber: 3,
    sugar: 20,
    allergens: 'None',
    dietType: 'Vegan',
    tags: veganTags([LO, KD]),
  },
];

const GRAINS = [
  { name: 'Oats', gluten: true },
  { name: 'Ragi', gluten: false },
  { name: 'Jowar', gluten: false },
  { name: 'Bajra', gluten: false },
  { name: 'Foxtail Millet', gluten: false },
  { name: 'Little Millet', gluten: false },
  { name: 'Barnyard Millet', gluten: false },
  { name: 'Kodo Millet', gluten: false },
  { name: 'Quinoa', gluten: false },
  { name: 'Brown Rice', gluten: false },
];

const BREAKFAST_SHAPES = ['Upma', 'Porridge', 'Idli', 'Dosa', 'Uttapam', 'Poha', 'Chilla'];

const FILLINGS = [
  'Mixed Vegetable',
  'Palak',
  'Tomato',
  'Onion',
  'Beetroot',
  'Carrot',
  'Methi',
  'Cabbage',
  'Corn',
  'Paneer',
];

const FILLING_SHAPES = ['Dosa', 'Uttapam', 'Chilla', 'Paratha', 'Thepla'];

const DALS = [
  'Moong Dal',
  'Masoor Dal',
  'Toor Dal',
  'Chana Dal',
  'Urad Dal',
  'Mixed Dal',
  'Palak Dal',
  'Tomato Dal',
  'Lauki Dal',
  'Methi Dal',
  'Garlic Dal',
  'Spinach Moong Dal',
];

const LUNCH_GRAINS = [
  { name: 'Brown Rice', plate: '1 cup cooked brown rice (50 g dry)' },
  { name: 'Red Rice', plate: '1 cup cooked red rice (50 g dry)' },
  { name: 'Foxtail Millet', plate: '1 cup cooked foxtail millet (50 g dry)' },
  { name: 'Quinoa', plate: '1 cup cooked quinoa (50 g dry)' },
  { name: 'Phulkas', plate: '2 whole-wheat phulkas (30 g flour each)' },
];

const SABZIS = [
  'Bhindi Masala',
  'Baingan Bharta',
  'Lauki Curry',
  'Tinda Curry',
  'Cabbage Sabzi',
  'Cauliflower Curry',
  'Beans Poriyal',
  'Carrot Peas Curry',
  'Karela Sabzi',
  'Pumpkin Curry',
  'Ridge Gourd Curry',
  'Broccoli Masala',
  'Zucchini Sabzi',
  'Aloo Gobi Light',
  'Palak Corn',
  'Methi Sabzi',
  'Capsicum Curry',
  'Mushroom Masala',
  'Baby Corn Curry',
  'Sprouts Curry',
  'Soyabean Curry',
  'Torai Curry',
  'Chayote Sabzi',
  'Beetroot Sabzi',
];

const BIRYANI_PROTEINS = [
  { name: 'Chicken', dietType: 'Non-Vegetarian', allergens: 'None', kcal: 460, protein: 32, tags: nvTags([WG]) },
  { name: 'Egg', dietType: 'Eggetarian', allergens: 'Eggs', kcal: 420, protein: 20, tags: eggTags([WG]) },
  { name: 'Fish', dietType: 'Non-Vegetarian', allergens: 'Fish', kcal: 430, protein: 28, tags: nvTags() },
  { name: 'Prawn', dietType: 'Non-Vegetarian', allergens: 'Shellfish', kcal: 410, protein: 26, tags: nvTags() },
  { name: 'Paneer', dietType: 'Vegetarian', allergens: 'Dairy', kcal: 440, protein: 22, tags: vegTags([HP, WG]) },
  { name: 'Soya Chunk', dietType: 'Vegan', allergens: 'Soy', kcal: 400, protein: 24, tags: veganTags([HP, WG]) },
  { name: 'Mixed Vegetable', dietType: 'Vegan', allergens: 'None', kcal: 370, protein: 10, tags: veganTags() },
  { name: 'Mushroom', dietType: 'Vegan', allergens: 'None', kcal: 360, protein: 12, tags: veganTags([HP]) },
  { name: 'Jackfruit', dietType: 'Vegan', allergens: 'None', kcal: 380, protein: 8, tags: veganTags() },
  { name: 'Cauliflower', dietType: 'Vegan', allergens: 'None', kcal: 350, protein: 9, tags: veganTags([LO]) },
  { name: 'Green Peas', dietType: 'Vegan', allergens: 'None', kcal: 390, protein: 13, tags: veganTags([HP]) },
  { name: 'Sprouted Moong', dietType: 'Vegan', allergens: 'None', kcal: 380, protein: 16, tags: veganTags([HP]) },
  { name: 'Chole', dietType: 'Vegan', allergens: 'None', kcal: 420, protein: 16, tags: veganTags([HP]) },
  { name: 'Rajma', dietType: 'Vegan', allergens: 'None', kcal: 430, protein: 17, tags: veganTags([HP]) },
];

const BIRYANI_GRAINS = [
  'Brown Rice',
  'Red Rice',
  'Foxtail Millet',
  'Barnyard Millet',
  'Quinoa',
  'Little Millet',
  'Jeera Brown Rice',
];

function buildSmoothies(list, seen) {
  for (const fruit of SMOOTHIE_FRUITS) {
    const fruitProfile = smoothieFruitProfile(fruit);
    for (const style of SMOOTHIE_STYLES) {
      add(
        list,
        seen,
        make({
          title: `${fruit} ${style.name}`,
          emoji: '🥤',
          mealType: 'Smoothies',
          dietType: style.dietType,
          prep: 5,
          kcal: style.kcal + fruitProfile.kcal,
          protein: style.protein,
          carbs: style.carbs + fruitProfile.carbs,
          fat: style.fat + fruitProfile.fat,
          fiber: style.fiber + fruitProfile.fiber,
          sugar: Math.max(2, style.sugar + fruitProfile.sugar),
          tags: style.tags,
          allergens: style.allergens,
          portion: '1 serving · 1 glass (300 ml)',
          ings: style
            .ings(fruit)
            .replace(`120 g ${fruit.toLowerCase()}`, fruitProfile.line),
          steps: blendSteps(fruit, style.extra),
          notes: `No added sugar. ${style.liquid} as the measured base.`,
        })
      );
    }
  }

  for (const fruit of ['Banana', 'Mango', 'Pineapple', 'Apple', 'Pear', 'Guava', 'Papaya', 'Kiwi']) {
    const fruitProfile = smoothieFruitProfile(fruit);
    add(
      list,
      seen,
      make({
        title: `Spinach ${fruit} Smoothie`,
        emoji: '🥬',
        mealType: 'Smoothies',
        dietType: 'Vegan',
        prep: 6,
        kcal: 170 + fruitProfile.kcal,
        protein: 5,
        carbs: 30 + fruitProfile.carbs,
        fat: 4 + fruitProfile.fat,
        fiber: 6 + fruitProfile.fiber,
        sugar: Math.max(2, 14 + fruitProfile.sugar),
        tags: veganTags([LO]),
        allergens: 'None',
        portion: '1 serving · 1 glass (300 ml)',
        ings: `1 cup spinach
120 g ${fruit.toLowerCase()}
200 ml water or coconut water
1 tsp lemon juice
4 ice cubes (optional)`,
        steps: blendSteps(`spinach and ${fruit}`, 'lemon'),
        notes: 'Greens first, then fruit. No juice concentrate.',
      })
    );
  }

  const drinks = [
    ['Cucumber Mint Chaas', '1 cucumber, 200 ml buttermilk, mint, roasted cumin, salt', 'Dairy'],
    ['Jeera Chaas', '200 ml buttermilk, roasted cumin, ginger, salt', 'Dairy'],
    ['Beetroot Chaas', '40 g beetroot, 200 ml buttermilk, cumin, salt', 'Dairy'],
    ['Tomato Chaas', '1 tomato, 200 ml buttermilk, coriander, salt', 'Dairy'],
    ['Pudina Chaas', '200 ml buttermilk, mint, green chilli, cumin', 'Dairy'],
    ['Light Aam Panna', '80 g raw mango, mint, roasted cumin, 250 ml water', 'None'],
    ['Kokum Sharbat Light', '4 kokum petals, 250 ml water, mint, cumin', 'None'],
    ['Jaljeera Cooler', '250 ml water, jaljeera, mint, lemon', 'None'],
    ['Lemon Mint Infusion', '250 ml water, lemon, mint, black salt', 'None'],
    ['Turmeric Golden Milk', '200 ml low-fat milk, 1/4 tsp turmeric, pinch pepper', 'Dairy'],
    ['Light Badam Milk', '200 ml low-fat milk, 6 soaked almonds, cardamom', 'Dairy, Nuts'],
    ['Saffron Milk Light', '200 ml low-fat milk, 4 saffron strands, 2 almonds', 'Dairy, Nuts'],
    ['Rose Lassi Light', '150 g yogurt, 50 ml water, 1 tsp rose water', 'Dairy'],
    ['Salted Lassi Light', '150 g yogurt, roasted cumin, salt, 50 ml water', 'Dairy'],
    ['Cucumber Coconut Cooler', '1 cucumber, 200 ml coconut water, mint, lemon', 'None'],
    ['Tomato Mint Cooler', '1 tomato, mint, lemon, 200 ml water, cumin', 'None'],
  ];
  for (const [title, ings, allergens] of drinks) {
    const vegan = allergens === 'None';
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥛',
        mealType: 'Smoothies',
        dietType: vegan ? 'Vegan' : 'Vegetarian',
        prep: 5,
        kcal: vegan ? 60 : 110,
        protein: vegan ? 1 : 6,
        carbs: vegan ? 12 : 10,
        fat: vegan ? 0 : 4,
        fiber: 1,
        sugar: vegan ? 6 : 7,
        tags: vegan ? veganTags([LO]) : vegTags([LO, KD]),
        allergens,
        portion: '1 serving · 1 glass (250–300 ml)',
        ings: drinkIngs(title) || ings,
        steps: `Measure every ingredient into a blender or churner.
Blend or whisk 30 seconds until frothy.
Taste for salt or lemon only — no sugar.
Pour into a tall glass over ice and serve at once.`,
        notes: 'Sip as a drink, not with extra snacks.',
      })
    );
  }
}

function buildBreakfast(list, seen) {
  for (const grain of GRAINS) {
    for (const shape of BREAKFAST_SHAPES) {
      const gluten = grain.gluten || shape === 'Paratha' || shape === 'Thepla' ? 'Gluten' : 'None';
      add(
        list,
        seen,
        make({
          title: `${grain.name} ${shape}`,
          emoji: shape === 'Porridge' ? '🥣' : '🥞',
          mealType: 'Breakfast',
          dietType: 'Vegan',
          prep: 10,
          cook: shape === 'Idli' ? 12 : 15,
          kcal: 320,
          protein: 10,
          carbs: 52,
          fat: 7,
          fiber: 7,
          sugar: 4,
          tags: veganTags(grain.gluten ? [] : [GF]),
          allergens: gluten,
          portion: `1 serving · ${shape === 'Idli' ? '3 idlis + sambar' : shape === 'Dosa' || shape === 'Uttapam' ? '2 pieces + sambar and chutney' : '1 bowl + chutney or curd'}`,
          ings: grainBreakfastIngs(grain.name, shape),
          steps:
            shape === 'Dosa' || shape === 'Uttapam'
              ? dosaSteps(grain.name)
              : shape === 'Chilla'
                ? chillaSteps(`${grain.name.toLowerCase()} flour batter`, 'vegetables')
                : grainBreakfastSteps(grain.name, shape),
          notes: 'Vegetable-heavy, 1 tsp oil, measured grain.',
        })
      );
    }
  }

  for (const filling of FILLINGS) {
    for (const shape of FILLING_SHAPES) {
      const dairy = filling === 'Paneer';
      const gluten = shape === 'Paratha' || shape === 'Thepla';
      const allergenList = [dairy && 'Dairy', gluten && 'Gluten'].filter(Boolean);
      add(
        list,
        seen,
        make({
          title: `${filling} ${shape}`,
          emoji: '🫓',
          mealType: 'Breakfast',
          dietType: filling === 'Paneer' ? 'Vegetarian' : 'Vegan',
          prep: 12,
          cook: 16,
          kcal: filling === 'Paneer' ? 380 : 330,
          protein: filling === 'Paneer' ? 16 : 11,
          carbs: 48,
          fat: filling === 'Paneer' ? 12 : 8,
          fiber: 6,
          sugar: 4,
          tags: filling === 'Paneer' ? vegTags([HP, KD]) : veganTags([KD]),
          allergens: allergenList.join(', ') || 'None',
          portion:
            shape === 'Paratha' || shape === 'Thepla'
              ? '1 serving · 2 stuffed breads + 1 katori dal + cucumber salad'
              : '1 serving · 2 pieces + sambar and chutney',
          ings: fillingBreakfastIngs(filling, shape),
          steps:
            shape === 'Chilla'
              ? chillaSteps('besan batter', filling)
              : filledBreakfastSteps(filling, shape),
          notes: 'Two pieces plus a side — complete plate.',
        })
      );
    }
  }

  const extras = [
    ['Pesarattu with Chutney', 'Vegan', 'Green moong batter, ginger, chilli, 1 tsp oil, coconut chutney, sambar', dosaSteps('pesarattu')],
    ['Rava Idli with Sambar', 'Vegetarian', 'Semolina batter, vegetables, 3 idlis, sambar, chutney', 'Steam 3 rava idlis 12 minutes. Serve with sambar and chutney.'],
    ['Set Dosa with Sambar', 'Vegan', 'Thick dosa batter, 2 set dosas, sambar, chutney', dosaSteps('set dosa')],
    ['Appam with Vegetable Stew', 'Vegetarian', '2 appams, coconut stew vegetables, 1 tsp coconut oil', 'Cook 2 appams. Simmer mixed vegetables in light coconut milk stew. Serve together.'],
    ['Puttu with Kadala', 'Vegan', 'Ragi or rice puttu, black chana curry, coconut', 'Steam puttu. Serve with 1 katori kadala curry.'],
    ['Idiyappam with Vegetable Stew', 'Vegan', '2 idiyappam nests, mixed vegetable stew', 'Steam idiyappam. Ladle vegetable stew over. One plate.'],
    ['Adai with Avial', 'Vegan', 'Lentil-rice adai batter, 2 adai, 1 katori avial', 'Spread thick adai, cook both sides. Serve with avial.'],
    ['Ven Pongal Light', 'Vegetarian', '40 g rice, 20 g moong, cumin, pepper, 1 tsp ghee, sambar', 'Cook rice and moong soft. Temper cumin-pepper in 1 tsp ghee. Serve with sambar.'],
    ['Millet Pongal', 'Vegan', '40 g millet, 20 g moong, cumin, pepper, 1 tsp oil, chutney', 'Cook millet and moong. Temper spices in 1 tsp oil. Serve with chutney.'],
    ['Sabudana Khichdi Light', 'Vegan', '40 g soaked sabudana, peanuts, potato, 1 tsp oil, lemon', 'Roast peanuts. Toss soaked sabudana with potato and 1 tsp oil. Finish with lemon.'],
    ['Thalipeeth with Thecha', 'Vegan', 'Multigrain flour, onion, 2 thalipeeth, green thecha, curd optional', 'Pat 2 thalipeeth, cook with 1 tsp oil total. Serve with thecha.'],
    ['Akki Roti with Chutney', 'Vegan', 'Rice flour, vegetables, 2 akki rotis, coconut chutney', 'Pat 2 vegetable akki rotis. Serve with chutney.'],
    ['Ragi Mudde with Sambar', 'Vegan', '1 ragi mudde, 1 katori sambar, palya', 'Roll hot ragi mudde. Serve with sambar and a dry vegetable.'],
    ['Jowar Bhakri with Thecha', 'Vegan', '2 jowar bhakris, green thecha, salad', 'Roast 2 bhakris. Serve with thecha and onion salad.'],
    ['Bajra Rotla with Kadhi', 'Vegetarian', '2 bajra rotlas, 1 katori thin kadhi, salad', 'Cook 2 rotlas. Serve with kadhi.'],
    ['Handvo Light', 'Vegetarian', 'Mixed lentil-rice batter, vegetables, 1 tsp oil, chutney', 'Bake or pan-cook a vegetable handvo slice. Serve with chutney.'],
    ['Khaman Dhokla Plate', 'Vegetarian', '3 pieces khaman, green chutney, 1 tsp oil tempering', 'Steam khaman. Temper mustard-sesame with 1 tsp oil. Serve 3 pieces with chutney.'],
    ['Moong Dal Cheela Masala', 'Vegan', 'Moong batter, onion-tomato, 2 cheelas, chutney, curd optional', chillaSteps('moong dal batter', 'onion tomato')],
    ['Paneer Bhurji with Phulkas', 'Vegetarian', '80 g paneer bhurji, 2 phulkas, salad', 'Scramble paneer with onion-tomato masala. Serve with 2 phulkas.'],
    ['Tofu Bhurji with Phulkas', 'Vegan', '80 g tofu bhurji, 2 phulkas, salad', 'Scramble tofu with onion-tomato. Serve with 2 phulkas.'],
    ['Mushroom Bhurji with Phulkas', 'Vegan', '1 cup mushroom bhurji, 2 phulkas, salad', 'Saute mushrooms dry, scramble with masala. Serve with 2 phulkas.'],
    ['Masala Omelette with Toast', 'Eggetarian', '2 egg whites + 1 yolk, vegetables, 1 tsp oil, 1 whole-wheat toast', 'Cook a stuffed omelette. Serve with 1 toast and salad.'],
    ['Egg White Bhurji with Phulkas', 'Eggetarian', '3 egg whites, vegetables, 2 phulkas', 'Scramble whites with masala. Serve with 2 phulkas.'],
    ['Egg Dosa with Chutney', 'Eggetarian', '1 dosa batter spread, 1 egg, chutney, sambar', 'Spread dosa, crack egg, cook through. Serve with sambar and chutney.'],
    ['Boiled Eggs with Millet Upma', 'Eggetarian', '2 boiled eggs, 1 bowl millet upma, salad', 'Serve 2 boiled eggs beside millet upma.'],
  ];
  for (const [title, dietType, ings, steps] of extras) {
    const nv = dietType === 'Eggetarian';
    add(
      list,
      seen,
      make({
        title,
        emoji: nv ? '🍳' : '🥞',
        mealType: 'Breakfast',
        dietType,
        prep: 10,
        cook: 15,
        kcal: nv ? 360 : 330,
        protein: nv ? 20 : 12,
        carbs: 42,
        fat: nv ? 12 : 8,
        fiber: 5,
        sugar: 4,
        tags:
          dietType === 'Eggetarian'
            ? eggTags([KD])
            : dietType === 'Vegetarian'
              ? vegTags([KD])
              : veganTags([KD]),
        allergens: nv ? 'Eggs' : title.includes('Kadhi') || title.includes('Pongal Light') || title.includes('Dhokla') || title.includes('Handvo') || title.includes('Paneer') ? 'Dairy' : 'None',
        portion: '1 serving · complete breakfast plate',
        ings: extraBreakfastIngs(title) || ings,
        steps: steps.split(/\r?\n/).filter(Boolean).length >= 2 ? steps : extraBreakfastSteps(title),
        notes: 'Complete plate, 1 tsp oil, no fried sides.',
      })
    );
  }
}

function buildLunch(list, seen) {
  for (const dal of DALS) {
    for (const grain of LUNCH_GRAINS) {
      add(
        list,
        seen,
        make({
          title: `${dal} with ${grain.name}`,
          emoji: '🍛',
          mealType: 'Lunch',
          dietType: 'Vegan',
          prep: 10,
          cook: 25,
          kcal: grain.name === 'Phulkas' ? 360 : 390,
          protein: 16,
          carbs: grain.name === 'Phulkas' ? 52 : 58,
          fat: 7,
          fiber: 9,
          sugar: 4,
          tags: veganTags([HP, GF].filter((tag) => tag !== GF || grain.name !== 'Phulkas')),
          allergens: grain.name === 'Phulkas' ? 'Gluten' : 'None',
          portion: `1 serving · 1 katori ${dal.toLowerCase()} + ${grain.plate} + salad`,
          ings: `40 g dry ${dal.toLowerCase()}
${grain.plate}
1 tsp oil
1/2 tsp cumin seeds
2 g ginger, minced
1 clove garlic, minced
1/4 tsp turmeric
40 g tomato, chopped
40 g cucumber-onion salad
1 tsp lemon juice`,
          steps: dalPlateSteps(dal.toLowerCase(), grain.name.toLowerCase()),
          notes: 'Dal plus grain plus salad is the full plate.',
        })
      );
    }
  }

  for (const sabzi of SABZIS) {
    const [ingredientLines, mainIngredient] = sabziIngredients(sabzi);
    for (const grain of LUNCH_GRAINS.slice(0, 3)) {
      add(
        list,
        seen,
        make({
          title: `${sabzi} with ${grain.name}`,
          emoji: '🥘',
          mealType: 'Lunch',
          dietType: 'Vegan',
          prep: 12,
          cook: 20,
          kcal: 370,
          protein: 11,
          carbs: 54,
          fat: 9,
          fiber: 8,
          sugar: 6,
          tags: veganTags(),
          allergens: 'None',
          portion: `1 serving · 1 katori ${sabzi.toLowerCase()} + ${grain.plate} + salad`,
          ings: `${ingredientLines}
${grain.plate}
1 tsp oil
40 g onion, chopped
40 g tomato, chopped
2 g ginger-garlic paste
1/4 tsp turmeric
40 g cucumber salad
1 tsp lemon juice`,
          steps: sabziPlateSteps(sabzi, mainIngredient, grain.plate),
          notes: 'One katori sabzi with measured grain.',
        })
      );
    }
  }

  const khichdis = [
    'Masoor Khichdi',
    'Mix Dal Khichdi',
    'Palak Khichdi',
    'Tomato Khichdi',
    'Oats Khichdi',
    'Quinoa Khichdi',
    'Lauki Khichdi',
    'Sprouted Moong Khichdi',
    'Bajra Khichdi',
    'Jowar Khichdi',
    'Carrot Peas Khichdi',
    'Mushroom Khichdi',
  ];
  for (const title of khichdis) {
    add(
      list,
      seen,
      make({
        title,
        emoji: '🍚',
        mealType: 'Lunch',
        dietType: 'Vegan',
        prep: 10,
        cook: 22,
        kcal: 360,
        protein: 13,
        carbs: 56,
        fat: 7,
        fiber: 8,
        sugar: 4,
        tags: veganTags([HP, GF, KD]),
        portion: '1 serving · 1 bowl khichdi + raita or salad',
        ings: khichdiIngs(title),
        steps: `Rinse grain and dal. Saute cumin and ginger in 1 tsp oil.
Add vegetables, turmeric and water. Cook until soft and porridge-like.
Rest 5 minutes. Serve 1 bowl with salad or a spoon of raita.`,
        notes: 'One bowl is the full lunch.',
      })
    );
  }

  const legumes = [
    ['Rajma with Foxtail Millet', 'rajma', 'foxtail millet'],
    ['Rajma with Quinoa', 'rajma', 'quinoa'],
    ['Chole with Foxtail Millet', 'chole', 'foxtail millet'],
    ['Chole with Quinoa', 'chole', 'quinoa'],
    ['Lobia with Brown Rice', 'lobia', 'brown rice'],
    ['Lobia with Millet Rice', 'lobia', 'millet'],
    ['Green Moong with Brown Rice', 'whole green moong', 'brown rice'],
    ['Kabuli Chana with Millet', 'kabuli chana', 'millet'],
    ['Soya Curry with Brown Rice', 'soya chunks', 'brown rice'],
    ['Soya Curry with Millet', 'soya chunks', 'millet'],
    ['Chana Masala with Phulkas', 'chana masala', '2 phulkas'],
    ['Lobia Masala with Phulkas', 'lobia', '2 phulkas'],
  ];
  for (const [title, protein, grain] of legumes) {
    add(
      list,
      seen,
      make({
        title,
        emoji: '🫘',
        mealType: 'Lunch',
        dietType: 'Vegan',
        prep: 15,
        cook: 30,
        kcal: 430,
        protein: 18,
        carbs: 62,
        fat: 8,
        fiber: 12,
        sugar: 5,
        tags: veganTags([HP, HF]),
        allergens: title.includes('Soya') ? 'Soy' : title.includes('Phulkas') ? 'Gluten' : 'None',
        portion: `1 serving · 1 katori ${protein} + ${grain} + salad`,
        ings: `40 g dry ${protein}, soaked and cooked
${cookedGrainLine(grain)}
1 tsp oil
40 g onion, chopped
40 g tomato, chopped
40 g cucumber salad
1 tsp lemon juice`,
        steps: `Soak and cook ${protein} until soft.
Make a 1 tsp oil onion-tomato masala and simmer the ${protein} 8 minutes.
Plate with measured ${grain} and salad.`,
        notes: 'Legume plus grain, no fried papad.',
      })
    );
  }

  const south = [
    'Avial with Brown Rice',
    'Cabbage Poriyal with Millet',
    'Keerai Kootu with Brown Rice',
    'Vegetable Sambar with Millet',
    'Lemon Rasam with Brown Rice',
    'Tomato Rasam with Millet',
    'Beans Poriyal with Brown Rice',
    'Ash Gourd Kootu with Millet',
  ];
  for (const title of south) {
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥥',
        mealType: 'Lunch',
        dietType: 'Vegan',
        prep: 12,
        cook: 25,
        kcal: 380,
        protein: 12,
        carbs: 58,
        fat: 8,
        fiber: 8,
        sugar: 5,
        tags: veganTags([GF]),
        portion: '1 serving · 1 cup rice or millet + 1 katori curry + poriyal',
        ings: southIngs(title),
        steps: `Rinse and cook the listed rice or millet in twice its volume of water until tender.
Heat the measured oil, add mustard or cumin, then cook the listed vegetables for 6–8 minutes.
For kootu or sambar, simmer the measured dal with turmeric and vegetables until soft; for poriyal, keep the vegetables dry and crisp-tender.
Plate the measured grain with the curry or kootu and vegetable side. Do not add fried appalam.`,
        notes: 'South Indian complete plate.',
      })
    );
  }

  const bowls = [
    'Tofu Millet Bowl',
    'Chickpea Quinoa Bowl',
    'Sprouts Brown Rice Bowl',
    'Paneer Millet Bowl',
    'Rajma Quinoa Bowl',
    'Grilled Vegetable Millet Bowl',
    'Palak Tofu Rice Bowl',
    'Corn Bean Millet Bowl',
    'Mushroom Quinoa Bowl',
    'Beetroot Hummus Bowl',
    'Cucumber Raita Rice Bowl',
    'Kala Chana Millet Bowl',
  ];
  for (const title of bowls) {
    const paneer = title.includes('Paneer') || title.includes('Raita');
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥗',
        mealType: 'Lunch',
        dietType: paneer ? 'Vegetarian' : 'Vegan',
        prep: 15,
        cook: 15,
        kcal: 420,
        protein: 18,
        carbs: 52,
        fat: 12,
        fiber: 9,
        sugar: 6,
        tags: paneer ? vegTags([HP]) : veganTags([HP]),
        allergens: paneer ? 'Dairy' : title.includes('Tofu') ? 'Soy' : 'None',
        portion: '1 serving · 1 loaded bowl',
        ings: bowlIngs(title),
        steps: `Cook or reheat the grain. Prep vegetables and protein.
Toss with 1 tsp oil or yogurt dressing, lemon and herbs.
Pack into one bowl. Eat the full bowl as lunch.`,
        notes: 'Bowl is the complete meal.',
      })
    );
  }

  const nonveg = [
    ['Chicken Curry with Brown Rice', 'chicken', '1 katori chicken curry + 1 cup brown rice'],
    ['Chicken Curry with Millet', 'chicken', '1 katori chicken curry + 1 cup millet'],
    ['Chicken Stir Fry with Millet', 'chicken', '120 g chicken stir fry + 1 cup millet'],
    ['Grilled Chicken with Millet', 'chicken', '120 g grilled chicken + millet + salad'],
    ['Fish Curry with Millet', 'fish', '1 katori fish curry + 1 cup millet'],
    ['Fish Curry with Brown Rice', 'fish', '1 katori fish curry + 1 cup brown rice'],
    ['Baked Fish with Salad Rice', 'fish', '120 g baked fish + 3/4 cup rice + salad'],
    ['Egg Curry with Brown Rice', 'egg', '2 eggs in curry + 1 cup brown rice'],
    ['Egg Curry with Millet', 'egg', '2 eggs in curry + 1 cup millet'],
    ['Chicken Keema with Phulkas', 'chicken', '1 katori keema + 2 phulkas + salad'],
    ['Prawn Curry with Brown Rice', 'prawn', '1 katori prawn curry + 1 cup brown rice'],
    ['Prawn Stir Fry with Millet', 'prawn', '120 g prawn stir fry + millet'],
    ['Tandoori Chicken with Millet', 'chicken', '120 g tandoori chicken + millet + salad'],
    ['Fish Tikka with Brown Rice', 'fish', '120 g fish tikka + rice + salad'],
    ['Egg Bhurji with Millet', 'egg', 'egg bhurji + 1 cup millet + salad'],
  ];
  for (const [title, protein, portion] of nonveg) {
    const dietType = protein === 'egg' ? 'Eggetarian' : 'Non-Vegetarian';
    add(
      list,
      seen,
      make({
        title,
        emoji: protein === 'egg' ? '🍳' : protein === 'fish' || protein === 'prawn' ? '🐟' : '🍗',
        mealType: 'Lunch',
        dietType,
        prep: 15,
        cook: 25,
        kcal: 450,
        protein: 32,
        carbs: 42,
        fat: 14,
        fiber: 5,
        sugar: 4,
        tags: dietType === 'Eggetarian' ? eggTags([WG]) : nvTags([WG]),
        allergens: protein === 'egg' ? 'Eggs' : protein === 'fish' ? 'Fish' : protein === 'prawn' ? 'Shellfish' : 'None',
        portion: `1 serving · ${portion}`,
        ings: `${protein === 'egg' ? '2 eggs' : `120 g ${protein}`}
${title.includes('Phulkas') ? '2 whole-wheat phulkas (30 g flour each)' : title.includes('Millet') ? '1 cup cooked millet (50 g dry)' : title.includes('Brown Rice') || title.includes('Rice') ? '1 cup cooked brown rice (50 g dry)' : '1 cup cooked grain (50 g dry)'}
1 tsp oil
40 g onion, chopped
40 g tomato, chopped
1/2 tsp turmeric
40 g cucumber salad`,
        steps: `Marinate or cube the ${protein}. Cook in 1 tsp oil with spices until just done.
Prepare the grain or warm phulkas.
Plate protein, grain and salad together as one lunch.`,
        notes: 'Skinless, 1 tsp oil, measured grain.',
      })
    );
  }
}

function buildDinner(list, seen) {
  for (const sabzi of SABZIS) {
    const [ingredientLines, mainIngredient] = sabziIngredients(sabzi);
    add(
      list,
      seen,
      make({
        title: `Phulkas with ${sabzi}`,
        emoji: '🫓',
        mealType: 'Dinner',
        dietType: 'Vegan',
        prep: 12,
        cook: 18,
        kcal: 340,
        protein: 11,
        carbs: 50,
        fat: 8,
        fiber: 8,
        sugar: 5,
        tags: veganTags(),
        allergens: 'Gluten',
        portion: `1 serving · 2 phulkas + 1 katori ${sabzi.toLowerCase()} + salad`,
        ings: `2 whole-wheat phulkas (30 g flour each)
${ingredientLines}
1 tsp oil in the sabzi
40 g cucumber-onion salad
1 tsp lemon juice`,
        steps: sabziPlateSteps(sabzi, mainIngredient, '2 phulkas'),
        notes: 'Lighter dinner plate: roti plus sabzi, no extra rice.',
      })
    );
  }

  for (const dal of DALS) {
    add(
      list,
      seen,
      make({
        title: `Phulkas with ${dal}`,
        emoji: '🫓',
        mealType: 'Dinner',
        dietType: 'Vegan',
        prep: 10,
        cook: 20,
        kcal: 350,
        protein: 16,
        carbs: 50,
        fat: 7,
        fiber: 9,
        sugar: 3,
        tags: veganTags([HP]),
        allergens: 'Gluten',
        portion: `1 serving · 2 phulkas + 1 katori ${dal.toLowerCase()} + salad`,
        ings: `2 whole-wheat phulkas (30 g flour each)
40 g ${dal.toLowerCase()} (dry)
1 tsp oil tadka
40 g cucumber-onion salad
1 tsp lemon juice`,
        steps: dalPlateSteps(dal.toLowerCase(), 'phulkas'),
        notes: 'Dal plus two phulkas is dinner.',
      })
    );
  }

  const soups = [
    'Tomato Soup with Toast',
    'Palak Soup with Toast',
    'Moong Soup with Toast',
    'Sweet Corn Soup with Toast',
    'Broccoli Soup with Toast',
    'Mushroom Soup with Toast',
    'Beetroot Soup with Toast',
    'Carrot Soup with Toast',
    'Lauki Soup with Toast',
    'Spinach Lentil Soup with Toast',
    'Chicken Vegetable Soup with Toast',
    'Lemon Coriander Soup with Toast',
    'Clear Vegetable Soup with Toast',
    'Mulligatawny Light with Toast',
    'Pumpkin Soup with Toast',
    'Tomato Lentil Soup with Toast',
    'Garlic Rasam Soup with Toast',
    'Hot and Sour Vegetable Soup with Toast',
    'Broth Chicken Soup with Toast',
    'Cauliflower Soup with Toast',
  ];
  for (const title of soups) {
    const chicken = title.toLowerCase().includes('chicken');
    add(
      list,
      seen,
      make({
        title,
        emoji: '🍲',
        mealType: 'Dinner',
        dietType: chicken ? 'Non-Vegetarian' : 'Vegan',
        prep: 10,
        cook: 18,
        kcal: chicken ? 280 : 220,
        protein: chicken ? 22 : 8,
        carbs: 28,
        fat: 6,
        fiber: 5,
        sugar: 6,
        tags: chicken ? nvTags([LO]) : veganTags([LO]),
        portion: '1 serving · 1 large bowl + 1 whole-wheat toast',
        ings: soupIngs(title),
        steps: soupSteps(title),
        notes: 'Soup plus one toast is the full dinner.',
      })
    );
  }

  const salads = [
    'Sprouts Vegetable Salad',
    'Chickpea Cucumber Salad',
    'Paneer Garden Salad',
    'Tofu Sesame Salad',
    'Quinoa Cucumber Salad',
    'Beetroot Orange Salad',
    'Kala Chana Salad',
    'Corn Tomato Salad',
    'Palak Chana Salad',
    'Cabbage Sprout Salad',
    'Grilled Chicken Salad',
    'Boiled Egg Salad',
    'Fish Lettuce Salad',
    'Mushroom Spinach Salad',
    'Rajma Corn Salad',
    'Watermelon Feta Light Salad',
  ];
  for (const title of salads) {
    let dietType = 'Vegan';
    let allergens = 'None';
    if (title.includes('Paneer') || title.includes('Feta')) {
      dietType = 'Vegetarian';
      allergens = 'Dairy';
    } else if (title.includes('Egg')) {
      dietType = 'Eggetarian';
      allergens = 'Eggs';
    } else if (title.includes('Chicken')) dietType = 'Non-Vegetarian';
    else if (title.includes('Fish')) {
      dietType = 'Non-Vegetarian';
      allergens = 'Fish';
    } else if (title.includes('Tofu')) allergens = 'Soy';
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥗',
        mealType: 'Dinner',
        dietType,
        prep: 15,
        cook: title.includes('Grilled') || title.includes('Fish') ? 12 : 0,
        kcal: 280,
        protein: 16,
        carbs: 28,
        fat: 10,
        fiber: 7,
        sugar: 6,
        tags: dietType === 'Vegan' ? veganTags([LC, LO]) : dietType === 'Vegetarian' ? vegTags([LC]) : nvTags([LC]),
        allergens,
        portion: '1 serving · 1 large salad bowl',
        ings: saladIngs(title),
        steps: saladSteps(title),
        notes: 'No creamy bottled dressing.',
      })
    );
  }

  const dinners = [
    ['Paneer Tikka with Salad', 'Vegetarian', 'Dairy', '80 g paneer tikka, salad, mint chutney, 1 phulka optional'],
    ['Chicken Tikka with Salad', 'Non-Vegetarian', 'None', '120 g chicken tikka, salad, mint chutney'],
    ['Tandoori Fish with Salad', 'Non-Vegetarian', 'Fish', '120 g tandoori fish, salad, lemon'],
    ['Grilled Paneer with Millet', 'Vegetarian', 'Dairy', '80 g grilled paneer, 3/4 cup millet, salad'],
    ['Tofu Stir Fry Dinner', 'Vegan', 'Soy', '100 g tofu, mixed vegetables, 1 tsp oil, 1/2 cup brown rice'],
    ['Mixed Vegetable Stir Fry with Roti', 'Vegan', 'Gluten', 'mixed veg stir fry, 2 phulkas'],
    ['Chicken Stir Fry with Roti', 'Non-Vegetarian', 'Gluten', '120 g chicken stir fry, 2 phulkas'],
    ['Egg Curry with Phulkas', 'Eggetarian', 'Eggs, Gluten', '2 eggs curry, 2 phulkas, salad'],
    ['Chicken Curry with Phulkas', 'Non-Vegetarian', 'Gluten', '1 katori chicken curry, 2 phulkas, salad'],
    ['Fish Curry with Phulkas', 'Non-Vegetarian', 'Fish, Gluten', '1 katori fish curry, 2 phulkas'],
    ['Palak Paneer with Phulkas', 'Vegetarian', 'Dairy, Gluten', '1 katori palak paneer, 2 phulkas'],
    ['Mushroom Masala with Phulkas', 'Vegan', 'Gluten', 'mushroom masala, 2 phulkas'],
    ['Veg Wrap Dinner', 'Vegan', 'Gluten', '1 whole-wheat wrap, grilled vegetables, hung curd optional'],
    ['Chicken Wrap Dinner', 'Non-Vegetarian', 'Gluten', '1 wrap, 80 g chicken, salad'],
    ['Paneer Wrap Dinner', 'Vegetarian', 'Dairy, Gluten', '1 wrap, 60 g paneer, salad'],
    ['Egg Wrap Dinner', 'Eggetarian', 'Eggs, Gluten', '1 wrap, egg bhurji, salad'],
    ['Tofu Wrap Dinner', 'Vegan', 'Soy, Gluten', '1 wrap, tofu, vegetables'],
    ['Light Moong Khichdi Dinner', 'Vegan', 'None', '1 small bowl moong khichdi, kadhi or salad'],
    ['Oats Vegetable Dinner Bowl', 'Vegan', 'Gluten', 'savoury oats, vegetables, 1 tsp oil'],
    ['Grilled Fish with Vegetables', 'Non-Vegetarian', 'Fish', '120 g grilled fish, steamed vegetables'],
  ];
  for (const [title, dietType, allergens, ings] of dinners) {
    add(
      list,
      seen,
      make({
        title,
        emoji: '🍽️',
        mealType: 'Dinner',
        dietType,
        prep: 12,
        cook: 18,
        kcal: 360,
        protein: 22,
        carbs: 36,
        fat: 11,
        fiber: 6,
        sugar: 4,
        tags: dietType === 'Vegan' ? veganTags() : dietType === 'Vegetarian' ? vegTags([HP]) : dietType === 'Eggetarian' ? eggTags() : nvTags(),
        allergens,
        portion: '1 serving · complete dinner plate',
        ings: dinnerPlateIngs(title) || ings,
        steps: dinnerSteps(title),
        notes: 'Lighter than lunch. No second helping of grain.',
      })
    );
  }
}

function buildSnacks(list, seen) {
  const roasted = [
    'Roasted Chana Masala',
    'Roasted Peanuts Light',
    'Roasted Soy Nuts',
    'Roasted Pumpkin Seeds',
    'Roasted Sunflower Seeds',
    'Masala Corn Cup',
    'Roasted Jowar Puff',
    'Roasted Bajra Puff',
    'Bhel Puffed Rice Light',
    'Khakra Chaat Light',
    'Roasted Makhana Peri Peri',
    'Roasted Makhana Turmeric',
    'Air Fried Sweet Potato Chaat',
    'Roasted Chana Jor Garam Light',
    'Murmura Chaat Light',
    'Roasted Flax Crackers',
  ];
  for (const title of roasted) {
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥜',
        mealType: 'Snack',
        dietType: 'Vegan',
        prep: 5,
        cook: title.includes('Air') ? 15 : 8,
        kcal: 140,
        protein: 6,
        carbs: 16,
        fat: 6,
        fiber: 4,
        sugar: 2,
        tags: veganTags([LO]),
        allergens: /peanut|soy|flax|seed/i.test(title) ? 'Nuts' : 'None',
        portion: '1 serving · 1 small bowl (30–40 g)',
        ings: roastedSnackIngs(title),
        steps: roastedSnackSteps(title),
        notes: 'Measured handful, not the packet.',
      })
    );
  }

  const chaats = [
    'Sprouts Chaat',
    'Moong Chaat',
    'Chana Chaat',
    'Kala Chana Chaat',
    'Corn Anar Chaat',
    'Cucumber Chaat',
    'Tomato Onion Chaat',
    'Beetroot Chaat',
    'Papdi Chaat Light',
    'Dahi Puri Light',
    'Fruit Chaat Masala',
    'Watermelon Chaat',
    'Papaya Chaat',
    'Guava Chaat',
    'Apple Chaat',
    'Pineapple Chaat',
    'Mango Chaat Light',
    'Pear Walnut Chaat',
  ];
  for (const title of chaats) {
    const dairy = title.includes('Dahi') || title.includes('Papdi');
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥗',
        mealType: 'Snack',
        dietType: dairy ? 'Vegetarian' : 'Vegan',
        prep: 10,
        kcal: dairy ? 180 : 120,
        protein: dairy ? 8 : 4,
        carbs: 18,
        fat: dairy ? 5 : 2,
        fiber: 4,
        sugar: 8,
        tags: dairy ? vegTags([LO, KD]) : veganTags([LO, KD]),
        allergens: dairy
          ? title.includes('Papdi') || title.includes('Puri')
            ? 'Dairy, Gluten'
            : 'Dairy'
          : title.includes('Walnut')
            ? 'Nuts'
            : 'None',
        portion: '1 serving · 1 bowl chaat',
        ings: chaatIngs(title),
        steps: `Chop and toss with lemon and chaat masala.
Add chilli and coriander. Keep sev to 1 tsp if used.
Serve at once so it stays crisp.`,
        notes: 'Chaat without fried heap of sev.',
      })
    );
  }

  const yogurt = [
    'Greek Yogurt with Berries',
    'Hung Curd with Cucumber',
    'Low Fat Curd with Flax',
    'Raita Cucumber Cup',
    'Raita Boondi Light',
    'Mishti Doi Light',
    'Yogurt with Pomegranate',
    'Yogurt with Papaya',
    'Yogurt with Apple Cinnamon',
    'Yogurt with Roasted Chana',
  ];
  for (const title of yogurt) {
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥛',
        mealType: 'Snack',
        dietType: 'Vegetarian',
        prep: 5,
        kcal: 150,
        protein: 10,
        carbs: 16,
        fat: 4,
        fiber: 2,
        sugar: 10,
        tags: vegTags([HP, KD]),
        allergens: 'Dairy',
        portion: '1 serving · 150 g yogurt cup',
        ings: yogurtIngs(title),
        steps: `Measure the yogurt into a clean bowl.
Wash, cut and add every remaining ingredient listed for this recipe.
Stir once and serve chilled. Do not add sugar, honey or granola.`,
        notes: 'Plain yogurt, fruit for sweetness.',
      })
    );
  }

  const fruits = [
    'Apple Walnut Cup',
    'Papaya Lime Bowl',
    'Guava Chaat Cup',
    'Orange Segments',
    'Muskmelon Bowl',
    'Watermelon Mint Bowl',
    'Pomegranate Cup',
    'Pear Cinnamon Cup',
    'Kiwi Bowl',
    'Mixed Fruit Cup',
    'Stewed Apple Cinnamon',
    'Banana with Peanut Butter',
    'Dates Almond Pair',
    'Fig Walnut Pair',
  ];
  for (const title of fruits) {
    const includesNuts = /Walnut|Almond|Peanut/i.test(title);
    add(
      list,
      seen,
      make({
        title,
        emoji: '🍎',
        mealType: 'Snack',
        dietType: 'Vegan',
        prep: 5,
        kcal: includesNuts ? 160 : 120,
        protein: 2,
        carbs: 24,
        fat: includesNuts ? 6 : 1,
        fiber: 4,
        sugar: 16,
        tags: veganTags([KD, LO]),
        allergens: /walnut|almond|peanut/i.test(title) ? 'Nuts' : 'None',
        portion: '1 serving · measured fruit cup',
        ings: fruitSnackIngs(title),
        steps: `Wash and cut the fruit. Measure nuts if listed (4–6 pieces).
Serve in a bowl. Eat slowly.`,
        notes: 'Whole fruit, not juice.',
      })
    );
  }

  const nuts = [
    'Almond Date Energy Bites',
    'Walnut Date Energy Bites',
    'Peanut Chikki Light',
    'Mixed Seeds Trail Mix',
    'Roasted Chana Trail Mix',
    'Coconut Almond Bites',
    'Ragi Ladoo Light',
    'Besan Ladoo Light',
    'Oats Ladoo Light',
    'Makhana Trail Mix',
  ];
  for (const title of nuts) {
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥜',
        mealType: 'Snack',
        dietType: 'Vegetarian',
        prep: 10,
        cook: 5,
        kcal: 180,
        protein: 6,
        carbs: 18,
        fat: 10,
        fiber: 3,
        sugar: 10,
        tags: vegTags([WG]),
        allergens: 'Nuts',
        portion: '1 serving · 2 small bites or 25 g mix',
        ings: nutBiteIngs(title),
        steps: nutSnackSteps(title),
        notes: 'Energy snack, not unlimited ladoos.',
      })
    );
  }

  const sundal = [
    'Chana Sundal',
    'Moong Sundal',
    'Peanut Sundal',
    'Corn Sundal',
    'Mixed Sprouts Sundal',
    'Kala Chana Sundal',
    'Green Peas Sundal',
    'Soybean Sundal',
    'Rajma Sundal',
    'Lobia Sundal',
    'Masala Sprouts Cup',
    'Steamed Corn Sundal',
    'Carrot Moong Sundal',
    'Coconut Chana Sundal',
  ];
  for (const title of sundal) {
    add(
      list,
      seen,
      make({
        title,
        emoji: '🫘',
        mealType: 'Snack',
        dietType: 'Vegan',
        prep: 8,
        cook: 10,
        kcal: 160,
        protein: 9,
        carbs: 20,
        fat: 5,
        fiber: 6,
        sugar: 3,
        tags: veganTags([HP, GF]),
        allergens: title.includes('Peanut') ? 'Nuts' : title.includes('Soy') ? 'Soy' : 'None',
        portion: '1 serving · 1 katori sundal',
        ings: sundalIngs(title),
        steps: `Temper mustard and curry leaves in 1 tsp oil.
Toss cooked legumes, chilli, coconut and lemon.
Serve 1 katori warm.`,
        notes: 'South Indian protein snack.',
      })
    );
  }

  const steamed = [
    'Steamed Idli Snack',
    'Mini Rava Idli Snack',
    'Vegetable Dhokla Snack',
    'Kothimbir Vadi Light',
    'Patra Light',
    'Steamed Corn on Cob',
    'Vegetable Momos Steam',
    'Oats Idli Snack',
    'Ragi Idli Snack',
    'Sandwich Dhokla Snack',
  ];
  for (const title of steamed) {
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥟',
        mealType: 'Snack',
        dietType: 'Vegan',
        prep: 10,
        cook: 12,
        kcal: 170,
        protein: 6,
        carbs: 28,
        fat: 4,
        fiber: 3,
        sugar: 3,
        tags: veganTags([LO, KD]),
        allergens: title.includes('Momos') ? 'Gluten' : 'None',
        portion: '1 serving · 2–3 small pieces',
        ings: steamedSnackIngs(title),
        steps: `Arrange the measured pieces in a steamer without overlapping.
Steam for 10–12 minutes, or until the centre is firm and hot. Do not fry after steaming.
Serve only the listed 2–3 pieces with the measured 2 tbsp chutney.`,
        notes: 'Steamed snack portion, not a meal.',
      })
    );
  }

  const eggSnacks = [
    'Boiled Egg Chaat',
    'Egg White Cup',
    'Masala Boiled Eggs',
    'Egg Open Sandwich',
    'Egg Bhurji Toast Snack',
    'French Toast Light',
    'Egg Muffin Vegetable',
    'Egg Salad Lettuce Cups',
  ];
  for (const title of eggSnacks) {
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥚',
        mealType: 'Snack',
        dietType: 'Eggetarian',
        prep: 8,
        cook: 10,
        kcal: 180,
        protein: 14,
        carbs: 8,
        fat: 10,
        fiber: 1,
        sugar: 2,
        tags: eggTags([LO]),
        allergens: title.includes('Toast') || title.includes('Sandwich') || title.includes('French') ? 'Eggs, Gluten' : 'Eggs',
        portion: '1 serving · 1–2 eggs',
        ings: eggSnackIngs(title),
        steps: `${title.includes('Boiled') || title.includes('Chaat') || title.includes('Masala') ? 'Boil 2 eggs for 10 minutes, peel, and quarter.' : title.includes('Bhurji') || title.includes('French') ? 'Beat the egg(s) with vegetables and cook in a non-stick pan.' : title.includes('Muffin') ? 'Whisk eggs with chopped vegetables and bake in a muffin cup at 180°C for 12 minutes.' : 'Cook the eggs as listed — boil, scramble, or bake.'}
Season with chaat masala or black pepper. Add toast only if listed.
Stop at this portion.`,
        notes: 'Protein snack between meals.',
      })
    );
  }

  const sandwiches = [
    'Cucumber Mint Sandwich',
    'Tomato Cheese Light Sandwich',
    'Hummus Vegetable Sandwich',
    'Paneer Sandwich Snack',
    'Tofu Sandwich Snack',
    'Corn Spinach Sandwich',
    'Chicken Open Sandwich',
    'Egg Chutney Sandwich',
  ];
  for (const title of sandwiches) {
    let dietType = 'Vegan';
    let allergens = 'Gluten';
    if (title.includes('Cheese') || title.includes('Paneer')) {
      dietType = 'Vegetarian';
      allergens = 'Gluten, Dairy';
    } else if (title.includes('Egg')) {
      dietType = 'Eggetarian';
      allergens = 'Gluten, Eggs';
    } else if (title.includes('Chicken')) dietType = 'Non-Vegetarian';
    add(
      list,
      seen,
      make({
        title,
        emoji: '🥪',
        mealType: 'Snack',
        dietType,
        prep: 8,
        cook: title.includes('Chicken') ? 8 : 0,
        kcal: 220,
        protein: 12,
        carbs: 26,
        fat: 7,
        fiber: 4,
        sugar: 4,
        tags:
          dietType === 'Vegan'
            ? veganTags([KD])
            : dietType === 'Vegetarian'
              ? vegTags([KD])
              : dietType === 'Eggetarian'
                ? eggTags([KD])
                : nvTags([KD]),
        allergens,
        portion: '1 serving · 1 sandwich (2 small slices)',
        ings: sandwichIngs(title),
        steps: `Toast bread if you like. Layer filling and chutney.
Cut once. Eat as the snack.`,
        notes: 'One sandwich, not a meal combo.',
      })
    );
  }
}

function buildBiryani(list, seen) {
  for (const protein of BIRYANI_PROTEINS) {
    for (const grain of BIRYANI_GRAINS) {
      add(
        list,
        seen,
        make({
          title: `${grain} ${protein.name} Biryani`,
          emoji: protein.dietType === 'Non-Vegetarian' ? '🍗' : '🍚',
          mealType: 'Biryani',
          dietType: protein.dietType,
          prep: 20,
          cook: 30,
          kcal: protein.kcal,
          protein: protein.protein,
          carbs: 52,
          fat: 12,
          fiber: 6,
          sugar: 5,
          tags: protein.tags,
          allergens: protein.allergens,
          portion: '1 serving · 1 bowl (200 g cooked) + cucumber salad',
          ings: `50 g ${grain.toLowerCase()} (dry)
${protein.name === 'Egg' ? '2 eggs' : protein.name === 'Mixed Vegetable' || protein.name === 'Cauliflower' || protein.name === 'Mushroom' || protein.name === 'Jackfruit' || protein.name === 'Green Peas' ? `150 g ${protein.name.toLowerCase()}` : `120 g ${protein.name.toLowerCase()}`}
80 g mixed vegetables (carrot, beans, peas)
1 tsp oil
1 tbsp lemon juice
1 tsp ginger-garlic paste
1/2 tsp biryani masala
1/4 tsp turmeric
2 green cardamom
2 cloves
1 small bay leaf
5 g mint leaves
5 g coriander leaves
80 g cucumber-onion salad`,
          steps: biryaniSteps(protein.name, grain),
          notes: 'Measured grain, 1 tsp oil, fresh cucumber salad on the side. Not a second bowl.',
        })
      );
    }
  }
}

export function buildExpandedHealthyIndianRecipes(existingTitles = []) {
  const seen = new Set(existingTitles);
  const list = [];
  buildSmoothies(list, seen);
  buildBreakfast(list, seen);
  buildLunch(list, seen);
  buildDinner(list, seen);
  buildSnacks(list, seen);
  buildBiryani(list, seen);
  return list;
}
