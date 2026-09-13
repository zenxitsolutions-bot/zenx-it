// Unsplash ids and Wikimedia filenames below were downloaded and visually checked.
// Guessed Unsplash ids previously mapped onions, pizza, stairs, sunglasses, and books onto recipes.

const unsplash = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

const wiki = (name) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=900`;

const almondsBowl = unsplash('1608797178974-15b35a64ede9');
const almondsPile = unsplash('1583126379180-ec70bb3178b1');
const mixedNuts = unsplash('1579282940892-6152e6e80c52');
const berrySmoothie = unsplash('1553530666-ba11a7da3888');
const bananaSmoothie = unsplash('1505252585461-04db1eb84625');
const greenSmoothie = unsplash('1610970881699-44a5587cabec');
const fruitPlatter = unsplash('1490474418585-ba9bad8fd0ea');
const oatsBowl = unsplash('1702648982253-8b851013e81f');
const brownEggs = unsplash('1582722872445-44dc5f7e3c8f');
const eggsAvocado = unsplash('1482049016688-2d3e1b311543');
const idliSambar = unsplash('1741376509109-e9edd6f24f5f');
const paneerCurry = unsplash('1631452180519-c014fe946bc7');
const vegCurryRice = unsplash('1585937421612-70a008356fbe');
const chickenNaan = unsplash('1565557623262-b51c2513a641');
const chickenCurry = unsplash('1603894584373-5ac82b2ae398');
const chickenBiryani = unsplash('1631515243349-e0cb75fb8d3a');
const biryaniPlate = unsplash('1589302168068-964664d93dc0');
const vegPulao = unsplash('1599043513900-ed6fe01d3833');
const grilledChicken = unsplash('1598515214211-89d3c73ae83b');
const grilledFish = unsplash('1519708227418-c8fd9a32b7a2');
const fishBiryani = wiki('Fish_Biriyani.jpg');
const vegSalad = unsplash('1512621776951-a57141f2eefd');
const rainbowBowl = unsplash('1546069901-ba9599a7e63c');
const powerBowl = unsplash('1490645935967-10de6ba17061');
const eggBhurji = wiki('Egg bhurji(anda bhurji).jpg');
const besanChilla = wiki('Chilla besan.JPG');
const oatsDosa = wiki('OATS DOSA 01.JPG');
const moongChilla = wiki('Moonglet chilla with curd and hot tea.jpg');
const upmaPlate = wiki('Upma South India.JPG');
const pohaBowl = wiki('Poha 4.jpg');
const dosaPlate = wiki('Dosa and Gravy.jpg');
const dalRoti = wiki('Dahl and paratha.jpg');
const parathaThali = wiki('Paratha with Dal & Vegetables.png');
const methiParatha = wiki('Palak Paratha.JPG');
const palakPaneer = wiki('Palak Paneer (Cottage cheese in spinach gravy).jpg');
const parathaDalCurd = wiki('Aloo paratha served with daal, curd and achar.jpg');
const coconutDrink = wiki('Coconut drink.jpg');
const roastedMakhana = wiki('Roasted and spiced Foxnuts (Phool Makhana).jpg');
const proteinBalls = wiki('Havregrynskugler.jpg');
const vegetableSoup = wiki('Simple vegetable soup 2009.jpg');
const chickenSoup = wiki('Chicken noodle soup (cropped).jpg');
const vegSandwich = wiki('Vegetable sandwich.jpg');
const kathiRoll = wiki('Chicken-kathi-roll-recipe.jpg');
const lassiDrink = wiki('Lassi.jpg');
const alooGobi = wiki('Aloo gobi.jpg');
const hummusPlate = wiki('Hummus from The Nile.jpg');
const khamanDhokla = wiki('Khaman dhokla.jpg');
const appamStack = wiki('Palappam.jpg');
const tomatoSoup = wiki('Tomato soup.jpg');
const chanaMasala = wiki('Chana masala.jpg');
const rajmaRice = wiki('Rajma.jpg');
const khichdiBowl = wiki('Khichdi.jpg');
const masalaOmelette = wiki('Indian Omelette.jpg');
const moongSprouts = wiki('Sprouts.jpg');
const paneerTikka = wiki('Paneer tikka.jpg');
const rotiDalSabzi = wiki('Staple Indian Food.jpg');
const yogurtCup = wiki('Yogurt.jpg');

export const CATALOG_IMAGES = {
  'Banana Oats Smoothie': bananaSmoothie,
  'Mango Yogurt Smoothie': bananaSmoothie,
  'Berry Smoothie': berrySmoothie,
  'Green Detox Smoothie': greenSmoothie,
  'Spinach Banana Smoothie': greenSmoothie,
  'Peanut Butter Banana Smoothie': bananaSmoothie,
  'Protein Smoothie': bananaSmoothie,
  'Dates and Almond Smoothie': bananaSmoothie,
  Buttermilk: lassiDrink,
  'Masala Chaas': lassiDrink,
  'Coconut Water Drinks': coconutDrink,
  'Healthy Lassi': lassiDrink,
  'Vegetable Upma': upmaPlate,
  'Oats Upma': upmaPlate,
  Poha: pohaBowl,
  'Vegetable Poha': pohaBowl,
  Idli: idliSambar,
  'Ragi Idli': idliSambar,
  'Vegetable Dosa': dosaPlate,
  'Ragi Dosa': dosaPlate,
  'Oats Dosa': oatsDosa,
  'Moong Dal Chilla': moongChilla,
  'Besan Chilla': besanChilla,
  'Vegetable Uttapam': dosaPlate,
  'Healthy Paratha': parathaDalCurd,
  'Paneer Paratha': parathaThali,
  'Methi Paratha': parathaThali,
  'Oats Porridge': oatsBowl,
  'Millet Porridge': oatsBowl,
  'Vegetable Sandwich': vegSandwich,
  'Egg Bhurji': eggBhurji,
  'Boiled Eggs with Vegetables': brownEggs,
  'Brown Rice with Dal': vegCurryRice,
  'Vegetable Khichdi': khichdiBowl,
  'Moong Dal Khichdi': khichdiBowl,
  'Rajma Rice': rajmaRice,
  'Chole with Brown Rice': chanaMasala,
  'Roti with Dal': dalRoti,
  'Vegetable Curry': vegCurryRice,
  'Paneer Curry': paneerCurry,
  'Palak Paneer': palakPaneer,
  'Mixed Vegetable Curry': vegCurryRice,
  'Sambar Rice': vegCurryRice,
  'Rasam Rice': vegCurryRice,
  'Millet Rice': vegPulao,
  'Quinoa Vegetable Bowl': rainbowBowl,
  'Grilled Chicken with Rice': grilledChicken,
  'Fish Curry with Rice': vegCurryRice,
  'Healthy Chicken Curry': chickenCurry,
  'Vegetable Soup': vegetableSoup,
  'Chicken Soup': chickenSoup,
  'Grilled Chicken': grilledChicken,
  'Grilled Fish': grilledFish,
  'Paneer Salad': powerBowl,
  'Vegetable Salad': vegSalad,
  'Dal with Roti': dalRoti,
  'Vegetable Curry with Roti': parathaThali,
  'Millet Khichdi': khichdiBowl,
  'Quinoa Bowl': powerBowl,
  'Egg Curry with Roti': rotiDalSabzi,
  'Chicken Curry with Roti': rotiDalSabzi,
  'Mixed Vegetable Stir Fry': rainbowBowl,
  'Healthy Wraps': vegSandwich,
  'Roasted Chana': mixedNuts,
  'Roasted Makhana': roastedMakhana,
  'Fruit Bowl': fruitPlatter,
  'Mixed Nuts': mixedNuts,
  'Almonds and Walnuts': almondsPile,
  'Greek Yogurt': yogurtCup,
  'Sprouts Salad': moongSprouts,
  'Corn Chaat': vegSalad,
  'Vegetable Chaat': vegSalad,
  'Peanut Chaat': mixedNuts,
  'Boiled Eggs': brownEggs,
  'Protein Balls': proteinBalls,
  'Dates and Nuts': almondsBowl,
  'Healthy Sandwich': vegSandwich,
  'Hummus with Vegetables': hummusPlate,
  'Healthy Chicken Biryani': chickenBiryani,
  'High Protein Chicken Biryani': biryaniPlate,
  'Brown Rice Chicken Biryani': chickenBiryani,
  'Vegetable Biryani': vegPulao,
  'Paneer Biryani': vegPulao,
  'Egg Biryani': biryaniPlate,
  'Fish Biryani': fishBiryani,
  'Millet Biryani': vegPulao,
  'Quinoa Biryani': vegPulao,
  'Soya Chunk Biryani': vegPulao,
};

const FALLBACK_IMAGES = {
  Smoothies: greenSmoothie,
  Breakfast: oatsBowl,
  Lunch: vegCurryRice,
  Dinner: vegSalad,
  Snack: rainbowBowl,
  Biryani: chickenBiryani,
};

// Expanded catalog titles reuse these visually checked dish-family photos.
// Never guess Unsplash ids here.
export function catalogImageFor(title, mealType) {
  if (CATALOG_IMAGES[title]) return CATALOG_IMAGES[title];
  const t = String(title || '').toLowerCase();

  if (
    (t.includes('yogurt') || t.includes('curd') || t.includes('raita') || t.includes('doi')) &&
    !t.includes('smoothie') &&
    !t.includes('lassi')
  ) {
    return yogurtCup;
  }
  if (t.includes('french toast')) return eggsAvocado;
  if (t.includes('dhokla') || t.includes('khaman')) return khamanDhokla;
  if (t.includes('mulligatawny')) return vegetableSoup;
  if (t.includes('sandwich')) {
    if (t.includes('chicken')) return grilledChicken;
    if (t.includes('egg')) return eggsAvocado;
    return vegSandwich;
  }
  if (t.includes('wrap') || t.includes('roll') || t.includes('frankie')) {
    return t.includes('chicken') ? kathiRoll : vegSandwich;
  }
  if (t.includes('hummus')) return hummusPlate;
  if (t.includes('appam') || t.includes('idiyappam') || t.includes('puttu')) return appamStack;
  if (t.includes('omelette') || t.includes('omelet')) return masalaOmelette;

  if (t.includes('coconut water') || t.includes('coconut drink')) return coconutDrink;
  if (t.includes('smoothie') || t.includes('shake')) {
    if (t.includes('spinach') || t.includes('green') || t.includes('mint') || t.includes('detox') || t.includes('kale')) {
      return greenSmoothie;
    }
    if (t.includes('berry') || t.includes('strawberry')) return berrySmoothie;
    return bananaSmoothie;
  }
  if (t.includes('mint cooler')) {
    if (/berry|strawberry|pomegranate|jamun|grape|plum/.test(t)) return berrySmoothie;
    if (/kiwi|guava|pear|apple/.test(t)) return greenSmoothie;
    return bananaSmoothie;
  }
  if (
    t.includes('lassi') ||
    t.includes('chaas') ||
    t.includes('buttermilk') ||
    t.includes('golden milk') ||
    t.includes('sharbat') ||
    t.includes('panna') ||
    t.includes('jaljeera') ||
    t.includes('infusion') ||
    t.includes('cooler')
  ) {
    return lassiDrink;
  }

  if ((t.includes('fish') || t.includes('prawn')) && t.includes('biryani')) return fishBiryani;
  if (t.includes('chicken') && t.includes('biryani')) return chickenBiryani;
  if (t.includes('egg') && t.includes('biryani')) return biryaniPlate;
  if (t.includes('biryani') || t.includes('pulao')) return vegPulao;

  if (t.includes('makhana') || t.includes('foxnut')) return roastedMakhana;
  if (t.includes('protein ball') || t.includes('energy ball') || t.includes('ladoo')) return proteinBalls;
  if ((t.includes('almond') && t.includes('walnut')) || t.includes('mixed nut')) return mixedNuts;
  if (t.includes('almond') || t.includes('badam')) return almondsPile;
  if (t.includes('walnut')) return mixedNuts;

  if (t.includes('chicken') && t.includes('soup')) return chickenSoup;
  if (t.includes('tomato') && t.includes('soup')) return tomatoSoup;
  if (t.includes('soup')) return vegetableSoup;

  if ((t.includes('sambar') || t.includes('rasam')) && (t.includes('rice') || t.includes('millet'))) {
    return vegCurryRice;
  }
  if (t.includes('sprout') && (t.includes('curry') || t.includes('khichdi') || t.includes('bowl'))) {
    return t.includes('khichdi') ? khichdiBowl : vegCurryRice;
  }
  if (t.includes('egg') && t.includes('curry')) {
    return t.includes('phulka') || t.includes('roti') ? rotiDalSabzi : vegCurryRice;
  }
  if ((t.includes('fish') || t.includes('prawn')) && t.includes('curry')) return vegCurryRice;
  if (t.includes('prawn') && t.includes('stir fry')) return rainbowBowl;

  if (t.includes('chicken') && t.includes('salad')) return grilledChicken;
  if (t.includes('fish') && t.includes('salad')) return grilledFish;
  if (t.includes('egg') && t.includes('salad')) return brownEggs;
  if (t.includes('paneer') && t.includes('salad')) return powerBowl;
  if (t.includes('fruit') && (t.includes('salad') || t.includes('chaat'))) return fruitPlatter;
  if (t.includes('fruit') && t.includes('chaat')) return fruitPlatter;
  if (t.includes('sprout')) return moongSprouts;
  if (t.includes('salad') || t.includes('sundal') || t.includes('chaat')) return vegSalad;
  if (t.includes('bowl')) return t.includes('paneer') ? powerBowl : rainbowBowl;

  if (t.includes('palak paneer')) return palakPaneer;
  if (t.includes('paneer') && (t.includes('tikka') || t.includes('grill'))) return paneerTikka;
  if (t.includes('egg bhurji')) return eggBhurji;
  if (t.includes('moong') && (t.includes('chilla') || t.includes('cheela'))) return moongChilla;
  if (t.includes('besan') && (t.includes('chilla') || t.includes('cheela'))) return besanChilla;
  if (t.includes('chilla') || t.includes('cheela') || t.includes('pudla')) return besanChilla;
  if (t.includes('oats') && t.includes('dosa')) return oatsDosa;
  if (t.includes('dosa') || t.includes('uttapam') || t.includes('pesarattu') || t.includes('adai')) return dosaPlate;
  if (t.includes('upma') || t.includes('pongal')) return upmaPlate;
  if (t.includes('poha')) return pohaBowl;
  if (t.includes('idli') || t.includes('sambar') || t.includes('rasam')) return idliSambar;
  if (t.includes('methi paratha') || t.includes('palak paratha')) return methiParatha;
  if (t.includes('paratha') || t.includes('thepla') || t.includes('thalipeeth') || t.includes('bhakri') || t.includes('rotla')) {
    return parathaDalCurd;
  }
  if (t.includes('dal') && (t.includes('roti') || t.includes('phulka'))) return dalRoti;
  if (t.includes('phulka') || t.includes('roti with') || (t.includes('phulkas') && t.includes('with'))) {
    return rotiDalSabzi;
  }
  if (t.includes('toast')) return vegSandwich;

  if (t.includes('gobi') || t.includes('cauliflower')) return alooGobi;
  if (t.includes('chole') || t.includes('chana masala') || t.includes('kabuli chana')) return chanaMasala;
  if (t.includes('rajma')) return rajmaRice;
  if (t.includes('khichdi')) return khichdiBowl;
  if (t.includes('dal') && (t.includes('rice') || t.includes('millet') || t.includes('quinoa'))) return vegCurryRice;
  if (t.includes('paneer')) return paneerCurry;

  if (t.includes('grilled chicken') || t.includes('chicken tikka') || t.includes('tandoori chicken') || t.includes('chicken stir')) {
    return grilledChicken;
  }
  if (t.includes('grilled fish') || t.includes('tandoori fish') || t.includes('fish tikka') || t.includes('baked fish')) {
    return grilledFish;
  }
  if (t.includes('fish') || t.includes('prawn')) return grilledFish;
  if (t.includes('chicken')) return chickenCurry;

  if (t.includes('boiled egg')) return brownEggs;
  if (t.includes('egg')) return masalaOmelette;

  if (t.includes('oats') || t.includes('porridge')) return oatsBowl;
  if (t.includes('millet') || t.includes('quinoa')) return vegPulao;
  if (t.includes('fruit')) return fruitPlatter;
  if (t.includes('stir fry')) return rainbowBowl;
  if (t.includes('curry') || t.includes('sabzi') || t.includes('rice') || t.includes('kootu') || t.includes('poriyal') || t.includes('avial')) {
    return vegCurryRice;
  }

  return FALLBACK_IMAGES[mealType] || vegCurryRice;
}

function card(portion, ings, steps) {
  return { portion, ings: ings.trim(), steps: steps.trim() };
}

export const CATALOG_DETAILS = {
  'Banana Oats Smoothie': card(
    '1 serving · 1 glass (300 ml)',
    `1 medium ripe banana (120 g)
40 g rolled oats
200 ml low-fat milk
1 tsp chia seeds (4 g)
3 almonds (5 g)
4 ice cubes`,
    `1. Add oats and milk to the blender and rest 2 minutes so the oats soften.
2. Add banana, chia seeds, almonds and ice.
3. Blend 45–60 seconds until completely smooth.
4. Pour into a 300 ml glass and drink immediately.`
  ),
  'Mango Yogurt Smoothie': card(
    '1 serving · 1 glass (300 ml)',
    `150 g ripe mango cubes (1 cup)
150 g unsweetened yogurt
50 ml cold water
4 fresh mint leaves
1 tsp flaxseed (3 g)`,
    `1. Add mango, yogurt, water, mint and flaxseed to a blender.
2. Blend 40 seconds until creamy.
3. Taste — do not add sugar; mango is sweet enough.
4. Serve in a 300 ml glass, chilled.`
  ),
  'Berry Smoothie': card(
    '1 serving · 1 glass (300 ml)',
    `150 g mixed berries (1 cup), fresh or frozen
100 g hung curd
100 ml water
1 tsp chia seeds (4 g)
2 drops liquid stevia (optional)`,
    `1. Add berries, hung curd, water and chia to the blender.
2. Blend until the seeds are broken down, about 50 seconds.
3. Sweeten with stevia only if needed.
4. Serve cold in a 300 ml glass.`
  ),
  'Green Detox Smoothie': card(
    '1 serving · 1 glass (300 ml)',
    `30 g spinach (1 packed cup)
80 g cucumber (1/2 small)
100 g green apple (1/2 apple)
15 ml lemon juice (1/2 lemon)
1 tsp soaked chia seeds (4 g)
150 ml coconut water`,
    `1. Wash spinach and cucumber. Core the apple; leave the skin on.
2. Blend spinach, cucumber, apple, lemon juice, chia and coconut water until bright green.
3. Serve immediately in a 300 ml glass. Do not store overnight.`
  ),
  'Spinach Banana Smoothie': card(
    '1 serving · 1 glass (300 ml)',
    `30 g spinach (1 cup)
1 medium banana (120 g)
150 ml unsweetened almond milk
1 tsp natural peanut butter (5 g)
4 ice cubes`,
    `1. Blend spinach with almond milk first so the leaves disappear.
2. Add banana, peanut butter and ice; blend until creamy.
3. Serve at once in a 300 ml glass.`
  ),
  'Peanut Butter Banana Smoothie': card(
    '1 serving · 1 glass (350 ml)',
    `1 medium ripe banana (120 g), preferably frozen in chunks
1 tbsp natural unsweetened peanut butter (16 g)
200 ml toned milk (or unsweetened almond milk)
1 tsp rolled oats (4 g)
1 pinch cinnamon
4 ice cubes (skip if banana is frozen)`,
    `1. Use a ripe spotted banana. For a thicker drink, peel, slice and freeze the banana 2 hours ahead.
2. Add milk and oats to the blender first so the blades move freely.
3. Add banana, peanut butter, cinnamon and ice.
4. Blend 45–60 seconds until completely smooth, with no peanut-butter streaks.
5. Taste — do not add sugar, honey or flavoured peanut butter. The banana is enough.
6. Pour into a 350 ml glass and drink at once. This is a smoothie, not oatmeal in a bowl.`
  ),
  'Protein Smoothie': card(
    '1 serving · 1 glass (350 ml)',
    `1 scoop unsweetened whey or plant protein (30 g)
150 g hung curd
60 g banana (1/2 banana)
1 tsp flaxseed (3 g)
100 ml water`,
    `1. Add protein powder, hung curd, banana, flaxseed and water.
2. Blend until no powder remains, about 40 seconds.
3. Serve in a 350 ml glass. Skip flavoured sweetened powders.`
  ),
  'Dates and Almond Smoothie': card(
    '1 serving · 1 glass (300 ml)',
    `4 seedless dates (24 g), soaked 10 minutes
8 almonds (12 g)
1 medium banana (120 g)
200 ml unsweetened almond milk
1 pinch cardamom powder`,
    `1. Soak dates in warm water 10 minutes, then drain.
2. Blend dates, almonds, banana, almond milk and cardamom until silky.
3. Serve in a 300 ml glass as a breakfast smoothie.`
  ),
  Buttermilk: card(
    '1 serving · 1 glass (250 ml)',
    `150 g fresh curd
100 ml cold water
0.25 tsp roasted cumin powder
1 pinch salt
1 tbsp chopped coriander (3 g)`,
    `1. Whisk curd with water until frothy, 30 seconds.
2. Stir in cumin, salt and coriander.
3. Serve immediately in a 250 ml glass, cold.`
  ),
  'Masala Chaas': card(
    '1 serving · 1 glass (250 ml)',
    `150 g curd
120 ml cold water
0.5 tsp grated ginger (2 g)
0.25 tsp roasted cumin powder
1 pinch black salt
6 mint leaves`,
    `1. Blend curd, water, ginger, cumin, black salt and mint 20 seconds.
2. Pour into a 250 ml glass over ice if you like.
3. Drink with lunch as a digestive.`
  ),
  'Coconut Water Drinks': card(
    '1 serving · 1 glass or 1 tender coconut (250 ml)',
    `1 tender coconut, or 250 ml fresh coconut water (not coconut milk)
4 mint leaves
1 tsp lemon juice (5 ml)
1 pinch black salt
2–3 ice cubes (optional)`,
    `1. Use a tender (elaneer / nariyal pani) coconut — the water should be clear and slightly sweet. Packaged coconut water is fine if it has no added sugar.
2. If using a whole coconut: have it opened, keep the water, and scrape a little soft malai if you like. Do not use thick coconut milk from mature coconut.
3. Pour 250 ml coconut water into a tall glass (or drink from the coconut with a straw).
4. Lightly crush the mint between your fingers, add lemon juice and a pinch of black salt. Stir.
5. Add ice only if the water is not already chilled. Serve immediately.
6. Do not add sugar, honey, soda or fruit syrup. This is a hydration drink, not a green smoothie.`
  ),
  'Healthy Lassi': card(
    '1 serving · 1 glass (250 ml)',
    `200 g unsweetened yogurt
50 ml cold water
0.25 tsp cardamom powder
3 soaked almonds (5 g)
1 seedless date (6 g), optional`,
    `1. Blend yogurt, water, cardamom and almonds until frothy.
2. Add the date only if you need a little sweetness.
3. Serve in a 250 ml glass. Skip rose syrup.`
  ),
  'Vegetable Upma': card(
    '1 serving · 1 bowl upma (250 g) + 2 tbsp coconut chutney',
    `40 g rava / sooji
1 tsp cold-pressed oil (5 ml)
40 g mixed vegetables, finely chopped (carrot, beans, peas, capsicum)
0.5 tsp mustard seeds
4 curry leaves
1 green chilli, slit
1 tsp chana dal (optional, for crunch)
300 ml water
0.25 tsp salt
2 tbsp coconut chutney (30 g)
4 coriander leaves`,
    `1. Dry-roast rava on medium heat 3–4 minutes until it smells nutty; do not brown it. Tip onto a plate.
2. Heat 1 tsp oil in the same pan. Splutter mustard seeds, then add chana dal, curry leaves and green chilli.
3. Add the chopped vegetables and sauté 2–3 minutes until they soften slightly.
4. Pour in 300 ml water and salt. Bring to a rolling boil.
5. Lower the heat. Rain in the roasted rava while stirring so no lumps form.
6. Cover and cook 3 minutes. The grains should be fluffy, not sticky.
7. Rest 2 minutes, fluff with a fork, and garnish with coriander.
8. Serve one 250 g bowl with 2 tbsp coconut chutney on the side. Do not fry a vada with it.`
  ),
  'Oats Upma': card(
    '1 serving · 1 bowl oats upma (250 g) + 2 tbsp coconut chutney',
    `40 g rolled oats (not instant sweet oats)
1 tsp oil (5 ml)
40 g mixed vegetables, chopped (carrot, beans, peas, onion)
0.5 tsp mustard seeds
4 curry leaves
1 green chilli, minced
0.25 tsp turmeric
250 ml water
0.25 tsp salt
2 tbsp coconut chutney (30 g)
1 tsp lemon juice (5 ml)`,
    `1. If the oats are large flakes, pulse once so they cook evenly. Do not grind to flour.
2. Heat 1 tsp oil. Splutter mustard seeds, curry leaves and chilli.
3. Add vegetables and sauté 2–3 minutes until they start to soften.
4. Add oats and turmeric. Toast 30–40 seconds so the oats pick up the seasoning.
5. Pour water and salt. Simmer uncovered 6–8 minutes, stirring, until the oats are cooked but not mushy.
6. Finish with lemon juice. The texture should look like savoury upma, not sweet porridge.
7. Serve one 250 g bowl with 2 tbsp coconut chutney. Skip sugar, milk and fruit toppings.`
  ),
  Poha: card(
    '1 serving · 1 plate (200 g)',
    `50 g thick poha
1 tsp oil (5 ml)
30 g onion, finely chopped
20 g green peas
0.5 tsp mustard seeds
0.25 tsp turmeric
0.25 tsp salt
1 tsp lemon juice (5 ml)`,
    `1. Rinse poha in a sieve and drain 5 minutes so it is moist, not soggy.
2. Heat 1 tsp oil, splutter mustard seeds, sauté onion and peas 3 minutes.
3. Add turmeric, salt and poha. Fold gently 2 minutes.
4. Finish with lemon juice. Serve one 200 g plate.`
  ),
  'Vegetable Poha': card(
    '1 serving · 1 plate (220 g)',
    `50 g thick poha
1 tsp oil (5 ml)
20 g carrot, finely chopped
20 g beans, finely chopped
20 g green peas
0.5 tsp mustard seeds
0.25 tsp turmeric
0.25 tsp salt
1 tsp lemon juice (5 ml)
1 tbsp roasted peanuts (8 g), optional`,
    `1. Rinse and drain poha.
2. Heat oil, splutter mustard, sauté carrot, beans and peas 4 minutes.
3. Add turmeric, salt and poha. Mix 2 minutes.
4. Add lemon and optional peanuts. Serve 220 g.`
  ),
  Idli: card(
    '1 serving · 3 idlis',
    `120 g fermented idli batter
Oil spray for the moulds (about 0.5 tsp)
1 tbsp coconut chutney (15 g)
50 g sambar (optional)`,
    `1. Lightly spray idli moulds.
2. Pour 40 g batter into each of 3 moulds.
3. Steam 10–12 minutes until a toothpick comes out clean.
4. Rest 1 minute, unmould, and serve with 1 tbsp chutney.`
  ),
  'Ragi Idli': card(
    '1 serving · 3 idlis',
    `80 g ragi flour
40 g fermented idli or urad batter
0.25 tsp salt
0.5 tsp oil for the moulds`,
    `1. Mix ragi flour into the fermented batter with salt. Rest 20 minutes.
2. Pour into 3 lightly sprayed moulds.
3. Steam 12 minutes.
4. Serve 3 idlis with a teaspoon of chutney or sambar.`
  ),
  'Vegetable Dosa': card(
    '1 serving · 1 dosa + 50 g sambar + 1 tbsp coconut chutney',
    `80 g fermented dosa batter
40 g finely chopped onion, tomato and capsicum
1 tsp oil (5 ml)
0.25 tsp salt
0.25 tsp cumin seeds
50 g sambar
1 tbsp coconut chutney (15 g)`,
    `1. Heat a tawa until a drop of water sizzles. Pour 80 g batter and spread into a thin circle.
2. Scatter vegetables, salt and cumin over the top.
3. Drizzle 1 tsp oil around the edge. Cook 2 minutes, flip 1 minute.
4. Fold and serve with 50 g sambar and 1 tbsp coconut chutney.`
  ),
  'Ragi Dosa': card(
    '1 serving · 1 dosa + 50 g sambar',
    `40 g ragi flour
20 g rice flour
150 ml water
1 tsp oil (5 ml)
0.25 tsp cumin seeds
0.25 tsp salt
20 g onion, finely chopped (optional)
50 g sambar`,
    `1. Whisk ragi, rice flour, water, cumin and salt to a pourable batter. Rest 10 minutes.
2. Pour onto a hot non-stick tawa and spread.
3. Sprinkle onion if using. Cook with 1 tsp oil, 2 minutes each side.
4. Serve 1 dosa with 50 g sambar.`
  ),
  'Oats Dosa': card(
    '1 serving · 2 oats dosas + 50 g sambar + 1 tbsp coconut chutney',
    `40 g oats flour (blend rolled oats)
1 tbsp rice flour (10 g)
150 ml water
1 tsp oil (5 ml) for both dosas
1 green chilli, minced
0.25 tsp cumin seeds
0.25 tsp salt
20 g onion, finely chopped
20 g carrot, grated (optional topping)
50 g sambar
1 tbsp coconut chutney (15 g)`,
    `1. Blend rolled oats to a fine flour if you do not have oats flour.
2. Whisk oats flour, rice flour, water, chilli, cumin and salt to a pourable batter. Rest 10 minutes.
3. Heat a non-stick tawa until a drop of water sizzles. Lightly grease.
4. Pour half the batter and spread into a thin 18 cm circle. Scatter onion and carrot.
5. Drizzle 0.5 tsp oil around the edge. Cook 2 minutes until the underside is golden and the edges lift.
6. Flip 45–60 seconds. Repeat for the second dosa.
7. Serve 2 crisp oats dosas with 50 g sambar and 1 tbsp coconut chutney — not as a sweet oat pancake.`
  ),
  'Moong Dal Chilla': card(
    '1 serving · 2 chillas + 2 tbsp mint chutney',
    `50 g yellow or green moong dal, soaked 2 hours
40 g onion, tomato and spinach, finely chopped
1 tsp oil (5 ml) for both chillas
0.25 tsp cumin seeds
0.25 tsp salt
2 g ginger
1 green chilli (optional)
30 g mint-coriander chutney (2 tbsp)
1 tsp lemon juice`,
    `1. Soak moong dal in water 2 hours. Drain well.
2. Grind dal with ginger, cumin, chilli and salt to a thick, slightly grainy batter. Do not add too much water.
3. Fold in chopped onion, tomato and spinach.
4. Heat a non-stick tawa. Spread half the batter into a 15 cm circle.
5. Cook 2–3 minutes on medium heat with 0.5 tsp oil until the underside is golden and the top looks set.
6. Flip and cook 1–2 minutes. Repeat for the second chilla.
7. Stir the measured lemon juice through the mint-coriander chutney.
8. Serve 2 chillas with 2 tbsp chutney. This is a savoury lentil pancake, not idli.`
  ),
  'Besan Chilla': card(
    '1 serving · 2 chillas + 1 tbsp mint-coriander chutney',
    `40 g besan (gram flour)
40 g mixed vegetables, finely chopped (onion, tomato, capsicum)
80 ml water
1 tsp oil (5 ml)
0.25 tsp ajwain
0.25 tsp turmeric
0.25 tsp salt
1 tbsp mint-coriander chutney (15 g)`,
    `1. Whisk besan, water, ajwain, turmeric and salt until completely lump-free. The batter should coat a spoon.
2. Fold in the chopped vegetables. Rest 5 minutes.
3. Heat a non-stick tawa. Pour half the batter and spread into a 15 cm pancake — thicker than a dosa, thinner than an omelette.
4. Cook 2–3 minutes with 0.5 tsp oil until the edges brown and the centre sets. Flip 1–2 minutes.
5. Repeat for the second chilla.
6. Serve 2 yellow gram-flour chillas with 1 tbsp mint-coriander chutney. Do not roll them with paneer unless it is listed.`
  ),
  'Vegetable Uttapam': card(
    '1 serving · 1 uttapam',
    `80 g fermented dosa batter
40 g onion, tomato and capsicum, finely chopped
1 tsp oil (5 ml)
1 tbsp coriander leaves (3 g)
0.25 tsp salt`,
    `1. Pour batter into a thick 15 cm circle on a hot tawa.
2. Top with vegetables, salt and coriander.
3. Drizzle 1 tsp oil, cover 3 minutes, flip 2 minutes.
4. Serve 1 uttapam.`
  ),
  'Healthy Paratha': card(
    '1 serving · 1 vegetable paratha + 150 g dal + cucumber salad',
    `40 g whole-wheat flour
30 g grated carrot and methi
30 ml water
1 tsp oil (5 ml)
0.25 tsp ajwain
0.25 tsp salt
40 g toor or moong dal
0.25 tsp turmeric
0.5 tsp cumin seeds
80 g cucumber-tomato salad`,
    `1. Cook dal with turmeric and water until soft. Temper cumin in 0.25 tsp of the measured oil and mix in (150 g cooked dal).
2. Knead flour, vegetables, ajwain, salt and water 4 minutes. Rest 10 minutes.
3. Roll to 18 cm. Cook on a hot tawa, brushing remaining oil, 2 minutes each side. Skip extra ghee.
4. Serve 1 paratha with 150 g dal and cucumber-tomato salad — paratha alone is not the meal.`
  ),
  'Paneer Paratha': card(
    '1 serving · 1 paneer paratha + 2 tbsp raita + salad',
    `40 g whole-wheat flour
50 g crumbled low-fat paneer
30 ml water
1 tsp oil (5 ml)
0.25 tsp cumin powder
0.25 tsp chilli powder
0.25 tsp salt
30 g unsweetened curd mixed with cucumber (raita)
80 g cucumber-tomato salad`,
    `1. Knead a soft dough; rest 10 minutes.
2. Mix paneer with cumin, chilli and salt.
3. Stuff, roll gently, and cook with 1 tsp oil, 2 minutes a side. No butter on top.
4. Serve 1 paratha with raita and salad.`
  ),
  'Methi Paratha': card(
    '1 serving · 1 methi paratha + 2 tbsp mint chutney',
    `40 g whole-wheat flour
30 g chopped fresh methi leaves
30 ml water
1 tsp oil (5 ml)
0.25 tsp ajwain
0.25 tsp salt
30 g mint-coriander chutney
1 tsp lemon juice`,
    `1. Knead methi into the flour with ajwain, salt and water. Rest 10 minutes.
2. Roll thin and cook on a tawa with 1 tsp oil until brown spots appear.
3. Stir lemon juice through the measured mint-coriander chutney.
4. Serve 1 paratha with 2 tbsp chutney.`
  ),
  'Oats Porridge': card(
    '1 serving · 1 bowl (280 g)',
    `40 g rolled oats
200 ml low-fat milk
60 g banana (1/2) or 40 g berries
1 tsp flaxseed (3 g)`,
    `1. Simmer oats in milk 6–8 minutes, stirring, until creamy.
2. Spoon into a bowl.
3. Top with banana or berries and flaxseed. Do not add sugar.`
  ),
  'Millet Porridge': card(
    '1 serving · 1 bowl (280 g)',
    `40 g foxtail or little millet
250 ml water
1 pinch salt or cardamom
1 tsp chopped almonds (4 g)`,
    `1. Rinse millet. Add water and salt or cardamom.
2. Simmer 12–15 minutes until creamy, adding a splash of water if it thickens too much.
3. Serve one bowl with 1 tsp chopped nuts.`
  ),
  'Vegetable Sandwich': card(
    '1 serving · 1 sandwich',
    `2 slices whole-wheat bread (60 g)
30 g cucumber, sliced
30 g tomato, sliced
20 g onion, sliced
15 g lettuce
2 tsp mint-coriander chutney (10 g)`,
    `1. Toast the bread lightly.
2. Spread the measured chutney on both slices.
3. Layer cucumber, tomato, onion and lettuce.
4. Close and cut. Serves 1. Skip butter and cheese.`
  ),
  'Egg Bhurji': card(
    '1 serving · 2-egg bhurji + 2 phulkas',
    `2 eggs (100 g)
1 tsp oil (5 ml)
20 g onion, chopped
20 g tomato, chopped
15 g capsicum, chopped
0.25 tsp turmeric
0.25 tsp chilli powder
1 tbsp coriander (3 g)
0.25 tsp salt
60 g whole-wheat flour (for 2 phulkas)
40 ml water for the dough`,
    `1. Knead whole-wheat flour and water into a soft dough. Rest 10 minutes, then divide into 2 balls.
2. Roll two thin phulkas. Cook on a hot tawa until they puff; no oil on the bread.
3. Heat 1 tsp oil in a pan. Sauté onion 1 minute, then tomato and capsicum 2 minutes until the tomato softens.
4. Beat eggs with turmeric, chilli powder and salt.
5. Pour the eggs into the pan. On medium heat, scramble 2–3 minutes until just set — soft curds, not dry rubber.
6. Finish with coriander. Do not add cream, cheese or extra oil.
7. Serve the bhurji immediately with the 2 phulkas (and cucumber slices if you like). This is a complete plate, not eggs alone.`
  ),
  'Boiled Eggs with Vegetables': card(
    '1 serving · 2 eggs + 1 cup salad',
    `2 eggs
100 g cucumber, tomato and mixed greens
1 tsp lemon juice (5 ml)
0.25 tsp black pepper
0.25 tsp salt`,
    `1. Boil eggs 9–10 minutes, cool under water, peel and halve.
2. Toss vegetables with lemon, pepper and salt.
3. Serve eggs on the salad. Skip mayonnaise.`
  ),
  'Brown Rice with Dal': card(
    '1 serving · 150 g cooked rice + 150 g dal',
    `50 g brown rice (dry)
40 g toor or moong dal
1 tsp oil (5 ml)
1 garlic clove, chopped
40 g tomato, chopped
0.25 tsp turmeric
0.5 tsp cumin seeds
0.25 tsp salt
200 ml water for dal, plus water to cook rice`,
    `1. Rinse brown rice and cook in 120 ml water until tender, about 25 minutes. Measure 150 g cooked.
2. Pressure-cook dal with turmeric and water until soft.
3. Heat 1 tsp oil, splutter cumin and garlic, add tomato, then mix into the dal.
4. Serve 150 g rice with 150 g dal.`
  ),
  'Vegetable Khichdi': card(
    '1 serving · 1 bowl (300 g)',
    `30 g rice
30 g moong dal
80 g mixed vegetables (carrot, beans, peas)
1 tsp oil (5 ml)
0.25 tsp turmeric
0.5 tsp cumin seeds
2 g ginger, chopped
0.25 tsp salt
350 ml water`,
    `1. Rinse rice and dal together.
2. Pressure-cook with vegetables, turmeric, ginger, salt and water (2 whistles).
3. Heat 1 tsp oil, splutter cumin, pour over the khichdi.
4. Serve one 300 g bowl.`
  ),
  'Moong Dal Khichdi': card(
    '1 serving · 1 bowl (300 g)',
    `50 g yellow moong dal
20 g rice
1 tsp oil (5 ml)
0.25 tsp turmeric
0.5 tsp cumin seeds
2 g ginger
20 g spinach (optional)
0.25 tsp salt
350 ml water`,
    `1. Wash dal and rice. Cook with turmeric, ginger, salt and water until soft, 15–18 minutes.
2. Stir in spinach if using, 2 minutes.
3. Temper cumin in 1 tsp oil and mix in.
4. Serve 300 g.`
  ),
  'Rajma Rice': card(
    '1 serving · 1 plate (150 g rice + 150 g rajma)',
    `50 g brown rice (dry)
80 g cooked rajma (from 30 g dry)
1 tsp oil (5 ml)
40 g onion, chopped
50 g tomato, chopped
1 garlic clove
0.5 tsp chilli powder
0.5 tsp coriander powder
0.25 tsp salt
1 tbsp coriander leaves`,
    `1. Cook brown rice; keep 150 g cooked.
2. Heat 1 tsp oil. Sauté onion and garlic, add tomato and spices, then rajma. Simmer 10 minutes.
3. Plate 150 g rice with 150 g rajma. Garnish with coriander.`
  ),
  'Chole with Brown Rice': card(
    '1 serving · 1 plate',
    `50 g brown rice (dry)
80 g cooked chickpeas (from 30 g dry)
1 tsp oil (5 ml)
40 g onion, chopped
50 g tomato, chopped
1 tsp chole masala
0.25 tsp salt`,
    `1. Cook brown rice; measure 150 g cooked (1 katori).
2. Make a tomato-onion gravy with 1 tsp oil and chole masala. Add chickpeas; simmer 10 minutes.
3. Serve chickpeas with the measured rice, not a heap.`
  ),
  'Roti with Dal': card(
    '1 serving · 2 rotis + 1 bowl dal (150 g)',
    `60 g whole-wheat flour (for 2 rotis)
40 ml water
40 g toor or moong dal
1 tsp oil (5 ml) for tadka
0.5 tsp cumin seeds
0.25 tsp turmeric
0.25 tsp salt
80 g cucumber-tomato salad`,
    `1. Knead flour and water. Roll 2 thin rotis and cook on a tawa without oil.
2. Cook dal with turmeric and salt. Temper cumin in 1 tsp oil and mix in.
3. Serve 2 rotis, 150 g dal and salad.`
  ),
  'Vegetable Curry': card(
    '1 serving · 200 g curry + 150 g cooked brown rice',
    `200 g mixed seasonal vegetables (carrot, beans, cauliflower, peas)
50 g brown rice (dry)
1 tsp oil (5 ml)
40 g onion, chopped
50 g tomato, chopped
0.25 tsp turmeric
0.5 tsp coriander powder
0.25 tsp garam masala
0.25 tsp salt
80 ml water for gravy
120 ml water for rice`,
    `1. Rinse brown rice. Cook in 120 ml water, covered, 25 minutes until tender. Keep 150 g cooked (1 katori).
2. Heat 1 tsp oil. Sauté onion until translucent, then tomato, turmeric, coriander and salt 4 minutes until the masala looks cooked.
3. Add vegetables and 80 ml water. Cover 12–15 minutes until just tender — not mushy.
4. Sprinkle garam masala, rest 2 minutes.
5. Serve 200 g curry over the measured brown rice. No cream or cashew paste. This is a full plate, not curry alone.`
  ),
  'Paneer Curry': card(
    '1 serving · 80 g paneer curry + 2 rotis',
    `80 g low-fat paneer, cubed
1 tsp oil (5 ml)
40 g onion, chopped
60 g tomato, chopped
0.5 tsp coriander powder
0.25 tsp garam masala
0.25 tsp kasuri methi
0.25 tsp salt
80 ml water
60 g whole-wheat flour (2 rotis)
40 ml water for dough`,
    `1. Knead flour and water. Rest 10 minutes. Roll and cook 2 thin rotis on a tawa without oil.
2. Sear paneer cubes in a dry non-stick pan 1 minute each side; set aside.
3. Heat 1 tsp oil. Cook onion, then tomato and spices 6 minutes. Add water; simmer 4 minutes.
4. Fold in paneer and kasuri methi. Do not add malai or butter.
5. Serve one bowl of curry with the 2 rotis.`
  ),
  'Palak Paneer': card(
    '1 serving · 250 g palak paneer + 2 rotis',
    `100 g spinach leaves, blanched
80 g low-fat paneer, cubed
1 tsp oil (5 ml)
2 garlic cloves
40 g tomato, chopped
0.5 tsp cumin seeds
0.25 tsp salt
60 g whole-wheat flour (2 rotis)
40 ml water for dough`,
    `1. Make 2 thin whole-wheat rotis and cook dry on a tawa.
2. Blanch spinach 2 minutes, cool under water, and blend smooth.
3. Heat 1 tsp oil, splutter cumin and garlic, add tomato, then spinach purée. Simmer 5 minutes.
4. Add paneer cubes. No cream.
5. Serve the palak paneer with the 2 rotis — spinach curry alone is not a complete meal.`
  ),
  'Mixed Vegetable Curry': card(
    '1 serving · 220 g curry + 150 g cooked brown rice',
    `220 g mixed vegetables (cauliflower, carrot, beans, peas)
50 g brown rice (dry)
1 tsp oil (5 ml)
50 g tomato, chopped
0.25 tsp turmeric
0.5 tsp coriander powder
0.25 tsp salt
80 ml water
120 ml water for rice`,
    `1. Cook brown rice 25 minutes; keep 150 g cooked.
2. Heat 1 tsp oil. Add tomato and spices; cook 3 minutes.
3. Add vegetables and water. Cover 12 minutes until just tender.
4. Plate the curry next to the measured rice. Do not add fried papad as a default side.`
  ),
  'Sambar Rice': card(
    '1 serving · 1 plate (150 g rice + 200 g sambar)',
    `50 g rice (dry)
40 g toor dal
80 g drumstick, pumpkin and brinjal
1 tsp oil (5 ml)
1 tsp sambar powder
1 tsp tamarind paste (5 g)
0.5 tsp mustard seeds
0.25 tsp salt
400 ml water`,
    `1. Cook rice; keep 150 g cooked.
2. Pressure-cook dal and vegetables with sambar powder, tamarind, salt and water.
3. Temper mustard in 1 tsp oil and mix in.
4. Serve sambar over the measured rice.`
  ),
  'Rasam Rice': card(
    '1 serving · 1 plate',
    `50 g rice (dry)
120 g tomato, chopped
1 tsp tamarind paste (5 g)
0.5 tsp crushed pepper and cumin
2 garlic cloves
1 tsp oil (5 ml)
0.5 tsp mustard seeds
0.25 tsp salt
1 tbsp coriander
400 ml water`,
    `1. Cook rice; keep 150 g cooked.
2. Simmer tomato, tamarind, garlic, pepper-cumin, salt and water 12 minutes.
3. Temper mustard in 1 tsp oil. Add coriander.
4. Pour rasam over the rice.`
  ),
  'Millet Rice': card(
    '1 serving · 150 g cooked millet + 150 g dal',
    `50 g foxtail or barnyard millet
40 g toor or moong dal
150 ml water for millet
200 ml water for dal
1 tsp oil (5 ml)
0.5 tsp cumin seeds
0.25 tsp turmeric
1 garlic clove, chopped
0.25 tsp salt
1 pinch salt for millet`,
    `1. Rinse millet. Cook with 150 ml water and a pinch of salt, covered, 15–18 minutes. Rest 5 minutes and fluff (150 g).
2. Pressure-cook dal with turmeric, salt and 200 ml water until soft.
3. Heat 1 tsp oil, splutter cumin and garlic, pour into the dal.
4. Serve millet with 150 g dal — millet alone is only a grain, not a meal.`
  ),
  'Quinoa Vegetable Bowl': card(
    '1 serving · 1 bowl (350 g)',
    `40 g quinoa
150 g mixed vegetables (capsicum, zucchini, carrot)
40 g boiled chickpeas
1 tsp olive oil (5 ml)
1 tsp lemon juice (5 ml)
0.25 tsp salt
120 ml water`,
    `1. Rinse quinoa and cook in 120 ml water 15 minutes.
2. Roast vegetables with 1 tsp oil 12 minutes.
3. Assemble quinoa, vegetables and chickpeas. Dress with lemon and salt.`
  ),
  'Grilled Chicken with Rice': card(
    '1 serving · 120 g chicken + 150 g cooked brown rice',
    `120 g skinless chicken breast
50 g brown rice (dry)
1 tsp oil (5 ml)
20 g yogurt
1 tsp ginger-garlic paste
0.5 tsp chilli powder
1 tsp lemon juice
80 g salad greens
0.25 tsp salt`,
    `1. Marinate chicken in yogurt, ginger-garlic, chilli, lemon and salt 20 minutes.
2. Cook brown rice; keep 150 g cooked.
3. Grill or pan-sear chicken in 1 tsp oil 6–7 minutes a side until cooked through.
4. Serve with rice and salad.`
  ),
  'Fish Curry with Rice': card(
    '1 serving · 120 g fish + 150 g cooked rice',
    `120 g fish fillet
50 g brown or red rice (dry)
1 tsp oil (5 ml)
40 g onion, sliced
50 g tomato, chopped
0.25 tsp turmeric
0.5 tsp chilli powder
0.25 tsp salt
80 ml water`,
    `1. Cook rice; keep 150 g cooked.
2. Sauté onion and tomato in 1 tsp oil with spices, 5 minutes. Add water.
3. Slide in the fish and simmer 6–8 minutes until just cooked.
4. Serve with the measured rice. Do not fry the fish first.`
  ),
  'Healthy Chicken Curry': card(
    '1 serving · 120 g chicken curry + 150 g cooked brown rice',
    `120 g skinless chicken, cubed
50 g brown rice (dry)
1 tsp oil (5 ml)
40 g onion, chopped
50 g tomato, chopped
1 tsp ginger-garlic paste
0.5 tsp coriander powder
0.25 tsp garam masala
0.25 tsp salt
80 ml water
120 ml water for rice
1 tbsp coriander`,
    `1. Cook brown rice 25 minutes; keep 150 g cooked.
2. Brown chicken in 1 tsp oil 3 minutes; set aside.
3. In the same pan sauté onion, ginger-garlic and tomato with spices. Add water.
4. Return chicken and simmer 12–15 minutes until cooked through. Skim fat. No cream.
5. Garnish with coriander. Serve the curry over the measured rice.`
  ),
  'Vegetable Soup': card(
    '1 serving · 1 bowl (300 ml) + 1 slice whole-wheat toast',
    `40 g carrot, diced
40 g beans, sliced
40 g cabbage, shredded
40 g green peas
20 g onion, chopped
1 tsp oil (5 ml)
2 garlic cloves, minced
5 g ginger, grated
500 ml water or unsalted vegetable stock
0.25 tsp black pepper
0.25 tsp salt
1 tbsp coriander leaves
1 slice whole-wheat bread (30 g)`,
    `1. Wash and cut all vegetables to similar small pieces so they cook evenly.
2. Heat 1 tsp oil in a saucepan. Sauté onion, garlic and ginger 1 minute until fragrant — do not brown.
3. Add carrot, beans, cabbage and peas. Sauté 2 minutes so they pick up the ginger-garlic.
4. Pour in 500 ml water or stock, salt and pepper. Bring to a boil, then simmer uncovered 12–14 minutes until the vegetables are tender but still hold their shape.
5. For a slightly thicker soup, ladle out one cup, mash or blend it, and stir it back in. Do not add cream, cornflour or soup cubes.
6. Finish with coriander. Toast 1 slice of whole-wheat bread (no butter).
7. Serve 300 ml soup with the toast. This is a clear mixed-vegetable soup, not a salad and not rasam.`
  ),
  'Chicken Soup': card(
    '1 serving · 1 bowl (300 ml) + 1 slice whole-wheat toast',
    `100 g skinless chicken breast or thigh, cut in small cubes
40 g carrot, diced
20 g beans, sliced
20 g celery or cabbage, chopped
20 g onion, chopped
2 garlic cloves, minced
5 g ginger, grated
1 tsp oil (5 ml)
400 ml water
0.25 tsp black pepper
0.25 tsp salt
1 tbsp coriander leaves
1 slice whole-wheat bread (30 g)`,
    `1. Trim all visible fat from the chicken and cut into 1 cm cubes.
2. Heat 1 tsp oil. Sauté onion, ginger and garlic 30–40 seconds.
3. Add chicken and stir 2 minutes until the outside turns white.
4. Add carrot, beans and celery, then 400 ml water, salt and pepper.
5. Simmer 18–20 minutes until the chicken is cooked through. Skim any foam or fat from the surface.
6. Do not add cream, noodles, soup powder or extra oil. Taste and add a squeeze of lemon if you like.
7. Finish with coriander. Toast 1 slice of whole-wheat bread (no butter).
8. Serve 300 ml chicken soup with the toast — a light dinner plate, not grilled chicken.`
  ),
  'Grilled Chicken': card(
    '1 serving · 120 g chicken + 150 g cooked brown rice + salad',
    `120 g skinless chicken breast
50 g brown rice (dry)
1 tsp oil (5 ml)
20 g yogurt
1 tsp lemon juice
1 garlic clove, minced
0.5 tsp chilli powder
0.25 tsp salt
80 g salad greens
120 ml water for rice`,
    `1. Cook brown rice 25 minutes; keep 150 g cooked.
2. Marinate chicken 15 minutes in yogurt, lemon, garlic, chilli and salt.
3. Grill or oven-bake at 200°C for 16–18 minutes until juices run clear. Rest 3 minutes.
4. Serve sliced chicken with the rice and salad. No fried sides.`
  ),
  'Grilled Fish': card(
    '1 serving · 120 g fish + 150 g cooked brown rice + lemon salad',
    `120 g fish fillet
50 g brown rice (dry)
1 tsp oil (5 ml)
1 tsp lemon juice
0.25 tsp turmeric
0.25 tsp black pepper
1 garlic clove, minced
0.25 tsp salt
80 g cucumber-tomato salad
120 ml water for rice`,
    `1. Cook brown rice 25 minutes; keep 150 g cooked.
2. Pat fish dry. Rub with oil, lemon, turmeric, pepper, garlic and salt.
3. Grill 5–6 minutes a side until the flesh flakes. No batter.
4. Serve with the measured rice and a small cucumber-tomato salad.`
  ),
  'Paneer Salad': card(
    '1 serving · 1 bowl (250 g)',
    `80 g low-fat paneer, cubed
80 g lettuce
40 g cucumber
40 g tomato
20 g onion
1 tsp olive oil (5 ml)
1 tsp lemon juice
0.25 tsp chaat masala
0.25 tsp salt`,
    `1. Toast paneer cubes in a dry pan 2 minutes.
2. Toss vegetables with oil, lemon, chaat masala and salt.
3. Add paneer and serve immediately.`
  ),
  'Vegetable Salad': card(
    '1 serving · 1 large bowl (200 g)',
    `80 g cucumber
50 g tomato
40 g carrot
30 g mixed greens
1 tsp olive oil (5 ml)
1 tsp lemon juice
0.25 tsp black salt
1 tbsp coriander`,
    `1. Chop vegetables.
2. Toss with lemon, oil, black salt and coriander.
3. Eat within 20 minutes.`
  ),
  'Dal with Roti': card(
    '1 serving · 2 rotis + 150 g dal',
    `40 g dal
60 g whole-wheat flour
40 ml water
1 tsp oil (5 ml)
0.5 tsp cumin seeds
0.25 tsp turmeric
0.25 tsp salt
80 g salad`,
    `1. Cook dal with turmeric and salt until soft.
2. Temper cumin in 1 tsp oil and mix in.
3. Roll and cook 2 thin rotis without oil.
4. Serve with salad. Lighter than rice at night.`
  ),
  'Vegetable Curry with Roti': card(
    '1 serving · 2 rotis + 180 g curry',
    `180 g mixed vegetables
1 tsp oil (5 ml)
50 g tomato, chopped
0.25 tsp turmeric
0.5 tsp coriander powder
0.25 tsp salt
60 g whole-wheat flour (2 rotis)
40 ml water`,
    `1. Cook vegetables in a tomato gravy with 1 tsp oil, 12–15 minutes.
2. Roll 2 thin rotis and cook dry on a tawa.
3. Serve two rotis, not four, with the curry.`
  ),
  'Millet Khichdi': card(
    '1 serving · 1 bowl (300 g)',
    `40 g foxtail millet
30 g moong dal
80 g mixed vegetables
1 tsp oil (5 ml)
0.25 tsp turmeric
0.5 tsp cumin seeds
0.25 tsp salt
350 ml water`,
    `1. Rinse millet and dal. Pressure-cook with vegetables, turmeric, salt and water.
2. Temper cumin in 1 tsp oil and mix in.
3. Serve one 300 g bowl.`
  ),
  'Quinoa Bowl': card(
    '1 serving · 1 bowl (320 g)',
    `40 g quinoa
150 g mixed vegetables
1 tsp olive oil (5 ml)
1 tsp lemon juice
1 tbsp herbs
0.25 tsp salt
120 ml water`,
    `1. Cook quinoa in 120 ml water 15 minutes.
2. Roast vegetables with 1 tsp oil 12 minutes.
3. Assemble, dress with lemon and herbs. One bowl.`
  ),
  'Egg Curry with Roti': card(
    '1 serving · 2 eggs + 2 rotis',
    `2 eggs
1 tsp oil (5 ml)
40 g onion, chopped
50 g tomato, chopped
0.25 tsp turmeric
0.5 tsp coriander powder
0.25 tsp salt
60 g whole-wheat flour
40 ml water`,
    `1. Boil eggs 10 minutes, peel and halve.
2. Make onion-tomato gravy with 1 tsp oil and spices. Add eggs; simmer 5 minutes.
3. Cook 2 rotis. Serve together, not with fried puri.`
  ),
  'Chicken Curry with Roti': card(
    '1 serving · 120 g chicken + 2 rotis',
    `120 g skinless chicken
1 tsp oil (5 ml)
40 g onion, chopped
50 g tomato, chopped
1 tsp ginger-garlic paste
0.5 tsp coriander powder
0.25 tsp salt
60 g whole-wheat flour
40 ml water`,
    `1. Cook chicken in onion-tomato gravy with 1 tsp oil, 15 minutes. No cream.
2. Roll 2 whole-wheat rotis.
3. Serve 120 g curry with 2 rotis. Remove visible fat.`
  ),
  'Mixed Vegetable Stir Fry': card(
    '1 serving · 220 g stir-fry + 150 g cooked brown rice',
    `220 g mixed vegetables (broccoli, capsicum, beans, carrot)
50 g brown rice (dry)
1 tsp oil (5 ml)
2 garlic cloves, sliced
0.25 tsp black pepper
1 tsp low-sodium soya sauce (optional)
0.25 tsp salt
120 ml water for rice`,
    `1. Cook brown rice 25 minutes; keep 150 g cooked.
2. Heat 1 tsp oil on high. Add garlic 20 seconds.
3. Stir-fry vegetables 6–7 minutes until crisp-tender. Season with pepper, salt and optional soya.
4. Serve over the measured rice so it is a meal, not only a side.`
  ),
  'Healthy Wraps': card(
    '1 serving · 1 wrap',
    `1 whole-wheat roti (40 g)
80 g sautéed mixed vegetables
2 tbsp hummus (30 g)
20 g lettuce
1 tsp oil (5 ml) to sauté vegetables
0.25 tsp salt`,
    `1. Sauté vegetables in 1 tsp oil 5 minutes. Cool slightly.
2. Warm the roti. Spread the measured hummus.
3. Add vegetables and lettuce, roll tightly. Serves 1. No mayonnaise.`
  ),
  'Roasted Chana': card(
    '1 serving · 30 g',
    `30 g roasted chana (bhuna chana), unsalted if possible
1 pinch chaat masala
0.5 tsp lemon juice (optional)
1 tbsp chopped onion and coriander (optional)`,
    `1. Weigh 30 g roasted chana — about a small katori, not a handful from a large packet.
2. If they feel soft, dry-roast 2 minutes in a pan until crisp.
3. Toss with chaat masala and lemon. Add onion and coriander only if you want a chaat-style snack.
4. Eat this measured portion. Do not keep refilling from the jar.`
  ),
  'Roasted Makhana': card(
    '1 serving · 1 small bowl (20 g fox nuts)',
    `20 g phool makhana / fox nuts (about 2 packed cups popped)
1 tsp oil (5 ml)
1 pinch black salt
1 pinch black pepper
1 pinch chaat masala (optional)`,
    `1. Weigh 20 g makhana first — a handful from the packet is usually more than one serving.
2. Heat a wide kadhai or pan on medium. Add the makhana dry and roast 4–5 minutes, stirring, until they feel light and a piece cracks crisply when pressed.
3. Add 1 tsp oil. Toss 2–3 minutes more so every piece is coated and faintly golden. Do not brown them or they turn bitter.
4. Take off the heat. Sprinkle black salt, pepper and optional chaat masala while still hot so the spices stick.
5. Cool 2 minutes. Serve one small bowl. These are puffed lotus seeds, not almonds or popcorn from a packet.`
  ),
  'Fruit Bowl': card(
    '1 serving · 1 bowl (150 g)',
    `50 g apple
50 g papaya or guava
50 g berries or orange
1 tsp lemon juice
1 pinch chaat masala`,
    `1. Chop fruit into bite-size pieces (150 g total).
2. Toss with lemon and chaat masala.
3. Serve at once.`
  ),
  'Mixed Nuts': card(
    '1 serving · 20 g (a small handful)',
    `8 g almonds (about 6)
6 g walnuts (2 halves)
6 g pistachios, unsalted and dry-roasted`,
    `1. Weigh 20 g mixed unsalted nuts.
2. Eat as a closed portion — do not continue from the jar.`
  ),
  'Almonds and Walnuts': card(
    '1 serving · 6 almonds + 2 walnuts',
    `6 almonds (9 g)
2 walnut halves (8 g)`,
    `1. Count the nuts (or soak almonds overnight, then peel).
2. Eat this measured portion only.`
  ),
  'Greek Yogurt': card(
    '1 serving · 150 g',
    `150 g unsweetened Greek yogurt or hung curd
40 g berries, or 1 pinch cinnamon`,
    `1. Spoon 150 g yogurt into a bowl.
2. Top with berries or cinnamon. No honey or sugar.`
  ),
  'Sprouts Salad': card(
    '1 serving · 1 bowl (150 g)',
    `100 g mixed sprouts (moong, chana)
20 g onion, chopped
20 g tomato, chopped
20 g cucumber, chopped
1 tsp lemon juice
0.25 tsp chaat masala
1 tbsp coriander
0.25 tsp salt`,
    `1. If needed, steam sprouts 3 minutes.
2. Toss with onion, tomato, cucumber, lemon, chaat masala, salt and coriander.
3. Serve one bowl.`
  ),
  'Corn Chaat': card(
    '1 serving · 1 bowl (150 g)',
    `80 g boiled sweet corn
20 g onion, chopped
20 g tomato, chopped
1 tbsp coriander
1 tsp lemon juice
0.25 tsp chaat masala
0.25 tsp salt`,
    `1. Boil or steam corn 5 minutes; drain.
2. Mix with onion, tomato, coriander, lemon, chaat masala and salt.
3. Serve one bowl. No sev, no butter.`
  ),
  'Vegetable Chaat': card(
    '1 serving · 1 bowl (160 g)',
    `40 g boiled potato, cubed
40 g cucumber
30 g tomato
20 g onion
20 g pomegranate arils
1 tsp lemon juice
0.25 tsp chaat masala
0.25 tsp salt`,
    `1. Chop vegetables. Keep potato to 40 g.
2. Toss with lemon, chaat masala and salt.
3. This is salad chaat — no puri or sev.`
  ),
  'Peanut Chaat': card(
    '1 serving · 30 g peanuts + salad',
    `30 g roasted peanuts
20 g onion, chopped
20 g tomato, chopped
1 tbsp coriander
1 tsp lemon juice
0.25 tsp chilli powder
0.25 tsp salt`,
    `1. Weigh 30 g roasted peanuts first.
2. Mix with onion, tomato, coriander, lemon, chilli and salt.
3. Serve immediately.`
  ),
  'Boiled Eggs': card(
    '1 serving · 2 eggs',
    `2 eggs
0.25 tsp black pepper
1 pinch chaat masala
50 g cucumber slices (optional)`,
    `1. Boil eggs 10 minutes, cool, peel.
2. Halve and season with pepper and chaat masala.
3. Add cucumber if you want more volume.`
  ),
  'Protein Balls': card(
    '1 serving · 2 balls (about 40 g)',
    `4 seedless dates (24 g), soaked 10 minutes if dry
1 tbsp rolled oats (8 g)
1 tbsp natural peanut or almond butter (16 g)
1 tsp flaxseed (3 g)
1 tsp unsweetened cocoa (optional)
1 tsp desiccated coconut to roll (optional)`,
    `1. If the dates are dry, soak in warm water 10 minutes, then drain well and pit.
2. Pulse oats in a mixer to a coarse meal (not flour).
3. Add dates, nut butter, flaxseed and cocoa. Pulse until the mix looks like sticky dough and holds when pressed. If it crumbles, add 1 tsp water; if it is too wet, add 1 tsp oats.
4. Divide into 2 equal portions (about 20 g each). Roll firmly between your palms.
5. Optionally roll in desiccated coconut.
6. Chill 20 minutes so they set. Eat 2 balls — not the whole batch. No condensed milk, sugar syrup or ghee ladoo method.`
  ),
  'Dates and Nuts': card(
    '1 serving · 2 dates + 4 almonds',
    `2 seedless dates (12 g)
4 almonds (6 g)`,
    `1. Pit the dates if needed. Press an almond into each, or eat alongside.
2. Stop at this portion.`
  ),
  'Healthy Sandwich': card(
    '1 serving · 1 sandwich',
    `2 slices whole-wheat bread (60 g)
2 tbsp hung curd (30 g)
30 g cucumber
30 g tomato
15 g onion
0.25 tsp black pepper
0.25 tsp chaat masala`,
    `1. Spread hung curd on both slices.
2. Layer vegetables and season.
3. Toast 2 minutes a side if you like. No cheese or mayonnaise.`
  ),
  'Hummus with Vegetables': card(
    '1 serving · 2 tbsp hummus + 150 g vegetable sticks',
    `2 tbsp hummus (30 g)
80 g cucumber sticks
40 g carrot sticks
30 g capsicum sticks
1 tsp lemon juice if the hummus is thick`,
    `1. If making hummus: blend 40 g boiled chickpeas with 1 tsp tahini, 1 tsp lemon, 1 small garlic clove and 1–2 tbsp water until smooth. Measure 2 tbsp for this serving.
2. Cut cucumber, carrot and capsicum into finger-length sticks (about 150 g).
3. Spoon hummus into a small bowl. Arrange the sticks around it.
4. Dip and eat. Skip fried pita, chips and extra oil drizzle.`
  ),
  'Healthy Chicken Biryani': card(
    '1 serving · 1 bowl (120 g chicken + 150 g cooked rice)',
    `120 g skinless chicken, cubed
50 g basmati rice (dry)
80 g mixed vegetables (beans, carrot, peas)
1 tsp oil (5 ml)
40 g yogurt
1 tsp ginger-garlic paste
0.5 tsp biryani masala
4 mint leaves
1 tbsp coriander
0.25 tsp salt
120 ml water for rice`,
    `1. Marinate chicken in yogurt, ginger-garlic, masala and salt 20 minutes.
2. Parboil rice until 70% done. Drain.
3. Heat 1 tsp oil. Cook chicken and vegetables 6 minutes.
4. Layer rice, mint and coriander. Cover and dum 15 minutes on low heat.
5. Serve one bowl only — not a family platter.`
  ),
  'High Protein Chicken Biryani': card(
    '1 serving · 1 bowl (150 g chicken + 120 g cooked rice)',
    `150 g skinless chicken breast, cubed
40 g basmati rice (dry)
80 g mixed vegetables
1 tsp oil (5 ml)
40 g yogurt
1 tsp ginger-garlic paste
0.5 tsp biryani masala
0.25 tsp salt`,
    `1. Marinate chicken 20 minutes.
2. Parboil the smaller rice portion.
3. Cook chicken and vegetables in 1 tsp oil, then dum with rice 15 minutes.
4. Serve one bowl: more chicken, less rice.`
  ),
  'Brown Rice Chicken Biryani': card(
    '1 serving · 1 bowl',
    `120 g skinless chicken
50 g brown rice (dry)
80 g mixed vegetables
1 tsp oil (5 ml)
40 g yogurt
1 tsp ginger-garlic paste
0.5 tsp biryani masala
0.25 tsp salt
140 ml water`,
    `1. Soak brown rice 20 minutes, then parboil 15 minutes.
2. Marinate and cook chicken with vegetables in 1 tsp oil.
3. Layer and dum 20 minutes until the rice is tender.
4. Serve one measured bowl.`
  ),
  'Vegetable Biryani': card(
    '1 serving · 1 bowl (300 g)',
    `50 g basmati or brown rice (dry)
180 g mixed vegetables (carrot, beans, cauliflower, peas)
1 tsp oil (5 ml)
0.5 tsp biryani masala
4 whole spices (1 bay leaf, 2 cloves, 1 cardamom)
4 mint leaves
0.25 tsp salt
120 ml water`,
    `1. Parboil rice to 70%. Drain.
2. Sauté vegetables and whole spices in 1 tsp oil 5 minutes.
3. Layer rice and mint. Dum 12 minutes.
4. Serve one bowl. No fried-onion garnish.`
  ),
  'Paneer Biryani': card(
    '1 serving · 1 bowl (80 g paneer)',
    `80 g low-fat paneer, cubed
50 g rice (dry)
80 g mixed vegetables
1 tsp oil (5 ml)
40 g yogurt
0.5 tsp biryani masala
0.25 tsp salt`,
    `1. Marinate paneer in yogurt and spices 10 minutes. Do not deep-fry.
2. Parboil rice. Cook vegetables in 1 tsp oil.
3. Layer paneer, vegetables and rice. Dum 12 minutes.
4. Serve one bowl.`
  ),
  'Egg Biryani': card(
    '1 serving · 1 bowl (2 eggs)',
    `2 eggs
50 g rice (dry)
80 g mixed vegetables
1 tsp oil (5 ml)
0.5 tsp biryani masala
4 mint leaves
0.25 tsp salt`,
    `1. Boil eggs 10 minutes, peel and halve. Do not fry.
2. Parboil rice. Cook vegetable masala in 1 tsp oil.
3. Layer rice, eggs and mint. Dum 10 minutes.
4. Serve one bowl.`
  ),
  'Fish Biryani': card(
    '1 serving · 1 bowl (120 g fish)',
    `120 g firm fish, cut in chunks
50 g rice (dry)
80 g mixed vegetables
1 tsp oil (5 ml)
40 g yogurt
0.5 tsp biryani masala
0.25 tsp turmeric
0.25 tsp salt`,
    `1. Marinate fish in yogurt, turmeric, masala and salt 15 minutes.
2. Parboil rice.
3. Cook vegetables in 1 tsp oil. Layer fish and rice. Dum 10 minutes on low so the fish stays in pieces.
4. Serve one bowl. Do not deep-fry the fish.`
  ),
  'Millet Biryani': card(
    '1 serving · 1 bowl (300 g)',
    `50 g foxtail millet
180 g mixed vegetables
1 tsp oil (5 ml)
0.5 tsp biryani masala
4 mint leaves
4 whole spices
0.25 tsp salt
140 ml water`,
    `1. Parboil millet 8 minutes. Drain.
2. Sauté vegetables and spices in 1 tsp oil.
3. Layer millet and mint. Dum 12 minutes. Fluff gently.
4. Serve one bowl.`
  ),
  'Quinoa Biryani': card(
    '1 serving · 1 bowl (300 g)',
    `40 g quinoa
180 g mixed vegetables
1 tsp oil (5 ml)
0.5 tsp biryani masala
4 mint leaves
0.25 tsp salt
120 ml water`,
    `1. Rinse quinoa and cook in 120 ml water until just done, 15 minutes.
2. Cook vegetable masala in 1 tsp oil.
3. Fold quinoa through the masala, add mint, cover 5 minutes.
4. Serve one bowl.`
  ),
  'Soya Chunk Biryani': card(
    '1 serving · 1 bowl (320 g)',
    `40 g dry soya chunks, soaked and squeezed (yields about 80 g)
50 g rice or millet (dry)
80 g mixed vegetables
1 tsp oil (5 ml)
0.5 tsp biryani masala
4 mint leaves
0.25 tsp salt`,
    `1. Soak soya chunks 15 minutes, squeeze dry, toss with spices.
2. Parboil rice. Cook vegetables in 1 tsp oil, add soya 3 minutes.
3. Layer with rice and mint. Dum 12 minutes.
4. Serve one measured bowl.`
  ),
};
