// Editorial methods for the catalog. Quantities refer to the recipe's base serving.
// Egg doneness: https://www.fda.gov/food/buy-store-serve-safe-food/what-you-need-know-about-egg-safety
// Sprout handling: https://www.foodsafety.gov/people-at-risk/pregnant-women
const numberSteps = (steps) => steps.filter(Boolean).map((step, i) => `${i + 1}. ${step}`).join('\n');
const lines = (recipe) => recipe.ingredients.split('\n').filter(Boolean);
const timing = (prep, cook = 0) => ({ prepTime: `${prep} min`, cookTime: cook ? `${cook} min` : 'No cooking', totalTime: `${prep + cook} min` });
const finish = (recipe, steps, prep, cook = 0, portionSize = '1 serving · the complete recipe below') => ({
  ...recipe, ...timing(prep, cook), portionSize, instructions: numberSteps(steps),
});

function fruitPrep(ingredients) {
  const text = ingredients.toLowerCase();
  const steps = [];
  if (/custard apple/.test(text)) steps.push('Split the custard apple and remove every black seed and all skin; use only the soft seed-free flesh.');
  if (/jamun/.test(text)) steps.push('Slit each jamun and discard its hard seed before weighing the fruit flesh.');
  if (/lychee/.test(text)) steps.push('Peel the lychees and remove the entire brown seed from each fruit.');
  if (/chikoo/.test(text)) steps.push('Peel the ripe chikoo and remove every hard black seed.');
  if (/\b(peach|plum)\b/.test(text)) steps.push('Cut around the stone, twist the fruit open and discard the stone.');
  if (/\bmango\b/.test(text)) steps.push('Peel the mango and cut the flesh away from the flat central stone.');
  if (/papaya/.test(text)) steps.push('Peel the papaya and scoop out the black seeds.');
  if (/watermelon|muskmelon/.test(text)) steps.push('Remove the melon rind and hard seeds.');
  if (/pineapple/.test(text)) steps.push('Remove the pineapple skin, eyes and tough central core.');
  const pomeFruit = ['apple', 'pear'].filter((fruit) => new RegExp(`\\b${fruit}\\b`).test(text.replace(/custard apple/g, ''))).join(' and ');
  if (pomeFruit) steps.push(`Remove the ${pomeFruit} core and seeds; the washed skin can stay on.`);
  if (/banana/.test(text)) steps.push('Peel the banana; break fresh flesh into chunks, or separate frozen pieces.');
  if (/orange/.test(text)) steps.push('Peel the orange, remove the thick white pith and pick out seeds.');
  if (/kiwi/.test(text)) steps.push('Peel the kiwi and cut into quarters.');
  if (/pomegranate/.test(text)) steps.push('Separate the pomegranate arils and discard all peel and white membrane.');
  if (/guava/.test(text)) steps.push('Trim the guava ends; scoop out the hard seed-filled center for a smoother drink.');
  if (/grapes/.test(text)) steps.push('Remove grape stems and any seeds; use washed seedless grapes when available.');
  if (/strawberry|berries/.test(text)) steps.push('Remove berry stems and strawberry green tops; use frozen fruit according to its packet directions.');
  if (/\bfig\b/.test(text)) steps.push('Trim the tough fig stalks.');
  if (/coconut meat/.test(text)) steps.push('Use coconut meat with the hard shell removed; cut the flesh into small pieces.');
  return steps.join(' ');
}

function smoothie(recipe) {
  const text = recipe.ingredients;
  const has = (pattern) => pattern.test(text);
  const prep = fruitPrep(text);
  const soak = has(/soaked|oats|dates|chia/i);
  return finish(recipe, [
    'Set out the measured ingredients and a clean blender. Wash fresh fruit, vegetables and herbs under running water; drain well. Fruit weights refer to the edible portion after trimming.',
    prep && `${prep} Cut larger pieces into roughly 2 cm chunks, then weigh the amount in the ingredient list.`,
    has(/dates/i) && 'Check each date for a pit and discard it. If firm, cover the measured dates with warm water for 10 minutes, then drain well before blending.',
    has(/soaked almonds/i) && 'For the listed soaked almonds, cover them with hot water for 10 minutes, drain and slip off the skins. This can overlap the date or seed soaking.',
    has(/chia/i) && 'Stir the chia seeds into 30 ml of the measured drink liquid and leave for 10 minutes, until gelled; reserve this mixture for blending.',
    has(/oats/i) && 'Put the oats in the blender with the remaining measured milk or other listed liquid after reserving any liquid for chia. Leave for 5 minutes to soften; this resting time can overlap the seed or date soaking.',
    !has(/oats/i) && 'Pour the remaining measured milk, water or coconut water into the blender first, then spoon in the yogurt or curd if listed. Do not add extra liquid beyond the amount in the ingredient list.',
    has(/spinach/i) && 'Add the drained spinach to the liquid and blend for 20–30 seconds, until no large leaf pieces remain.',
    `Add the prepared fruit and the remaining listed ingredients${has(/chia/i) ? ', including the gelled chia and its reserved soaking liquid' : ''}. Include only the optional additions you have measured. Keep ice until the final blending step.`,
    'Blend on high for 45–60 seconds. Switch off before scraping the sides, then blend for another 15–20 seconds if pieces remain; the drink should be evenly creamy, not gritty or streaky.',
    has(/ice/i) && 'If using the listed ice, add it now and pulse until crushed. Omit it when using frozen banana as specified in the ingredients.',
    'Pour the complete mixture into a large glass or jug, stir and serve immediately. The full measured batch is one serving; glass volume varies with fruit and ice.',
  ], soak ? 20 : 10, 0, '1 serving · the entire blended drink');
}

function otherDrink(recipe) {
  const title = recipe.title;
  const has = (pattern) => pattern.test(recipe.ingredients);
  if (title === 'Light Aam Panna') return finish({ ...recipe, ingredients: recipe.ingredients.replace('raw mango pulp', 'raw green mango flesh, peeled and stone removed') }, [
    'Cut the measured green mango flesh into 1 cm pieces. Put it in a small saucepan with 100 ml of the listed water.',
    'Cover and simmer on low heat for 10–15 minutes, until the mango crushes easily with a fork. Keep the cooking liquid.',
    'Cool the mango and liquid for 15 minutes before transferring to a blender. Add the mint, cumin and remaining 150 ml water.',
    'Blend for 30–45 seconds until smooth. Pour the complete batch into a glass and serve; this version is tart and contains no added sweetener.',
  ], 20, 15, '1 serving · the entire mango drink');
  if (title === 'Kokum Sharbat Light') return finish(recipe, [
    'Rinse the kokum petals. Soak them in 100 ml of the measured water for 20 minutes, until softened and the water turns deep pink.',
    'Press the softened petals with the back of a spoon, then strain the infused liquid into a jug and discard the petals.',
    'Stir in the remaining 150 ml water and the cumin. Wash and lightly crush the mint leaves, then add them.',
    'Pour into one glass and serve. This unsweetened version is tangy, not a syrup-based sharbat.',
  ], 25, 0, '1 serving · 250 ml kokum drink');
  if (/Golden Milk|Badam Milk|Saffron Milk/.test(title)) return finish(recipe, [
    has(/soaked almonds/) && 'Cover the measured almonds with hot water for 10 minutes, drain and peel. Blend with 30 ml of the listed milk until smooth.',
    has(/saffron/) && 'Crush the saffron lightly and soak in 1 tbsp of the measured warm milk for 5 minutes. Finely slice the measured almonds.',
    'Pour the milk into a small saucepan. Add the listed spices and the prepared almond paste or saffron milk if present.',
    'Warm over low heat for 4–5 minutes, stirring often, until steaming with small bubbles at the edge. Do not boil hard or leave the pan unattended.',
    'Stir once more, pour into a mug and add the sliced almonds if listed. Let it cool to a comfortable drinking temperature before serving.',
  ], has(/soaked almonds/) ? 15 : 5, 5, '1 serving · 1 mug');
  const fresh = has(/cucumber|tomato|mint|pudina|coriander|ginger|beetroot/i);
  return finish(recipe, [
    'Measure all the ingredients before starting. Keep dairy ingredients chilled until mixing.',
    fresh && 'Wash the vegetables and herbs. Trim the cucumber or tomato if listed, chop into 1 cm pieces, and remove tough herb stems. Peel and finely grate the measured ginger or beetroot if listed.',
    has(/almonds|date/i) && 'Check the date for a pit if using it. Soak the measured almonds in hot water for 10 minutes, then drain and peel.',
    has(/yogurt|curd|buttermilk/i)
      ? 'Whisk the yogurt, curd or buttermilk until smooth, adding water only when it is included in the ingredient list. For drinks with chopped vegetables or almonds, use a blender for 30–45 seconds instead.'
      : 'Pour the measured water or coconut water into a clean jug. Use coconut water, not thick coconut milk.',
    has(/cucumber|tomato|beetroot/i) && 'Blend the vegetable pieces into the liquid for 30–45 seconds, until finely broken down. Switch off before scraping the blender sides.',
    has(/almonds|date/i) && 'Add the prepared almonds and the pitted date if using it. Blend for 45–60 seconds until no nut or date pieces remain.',
    'Stir or briefly blend in the remaining measured spices, herbs and flavorings. Add only the optional ingredients you are using; do not add extra syrup.',
    'Pour the entire drink into a glass and serve immediately. Whisk again if the drink separates while standing.',
  ], has(/almonds|date/i) ? 15 : 10, 0, '1 serving · the entire prepared drink');
}

const FRUIT_SNACKS = new Set(['Fruit Bowl', 'Apple Walnut Cup', 'Papaya Lime Bowl', 'Guava Chaat Cup', 'Orange Segments', 'Muskmelon Bowl', 'Watermelon Mint Bowl', 'Pomegranate Cup', 'Pear Cinnamon Cup', 'Kiwi Bowl', 'Mixed Fruit Cup', 'Stewed Apple Cinnamon', 'Banana with Peanut Butter']);
const YOGURT_SNACKS = /^(Greek Yogurt|Hung Curd|Low Fat Curd|Raita|Mishti Doi|Yogurt with)/;
const STEAMED_SNACKS = new Set(['Steamed Idli Snack', 'Mini Rava Idli Snack', 'Vegetable Dhokla Snack', 'Kothimbir Vadi Light', 'Patra Light', 'Steamed Corn on Cob', 'Vegetable Momos Steam', 'Oats Idli Snack', 'Ragi Idli Snack', 'Sandwich Dhokla Snack']);
const PAIRS = new Set(['Mixed Nuts', 'Almonds and Walnuts', 'Dates and Nuts', 'Dates Almond Pair', 'Fig Walnut Pair']);

function fruitSnack(recipe) {
  const stewed = recipe.title === 'Stewed Apple Cinnamon';
  if (stewed) recipe = { ...recipe, ingredients: recipe.ingredients.replace('apple, stewed', 'apple, cored and diced').replace('apple stewed', 'apple, cored and diced') };
  return finish(recipe, [
    'Wash and drain the fresh fruit. Weigh the edible portion after removing peel, cores or stones; use the quantities shown in the ingredient list.',
    fruitPrep(recipe.ingredients),
    stewed ? 'Cut the apple into 1 cm cubes. Put it in a small saucepan with the listed 2 tbsp water and cinnamon.' : 'Cut the prepared fruit into bite-size pieces and place in a serving bowl; leave orange segments and pomegranate arils intact.',
    stewed ? 'Cover and simmer on low heat for 8–10 minutes, stirring twice, until a fork slides easily into the apple. Remove the lid for the final minute if liquid remains.' : 'Add the measured nuts, herbs, nut butter, citrus juice or seasoning only where listed. Fold gently so soft fruit keeps its shape.',
    stewed ? 'Let the apple cool for 2 minutes. Spoon all the apple and its juices into one bowl and serve warm.' : 'Serve the complete bowl immediately; add citrus juice just before serving to keep the fruit fresh and crisp.',
  ], 10, stewed ? 10 : 0, '1 serving · the complete fruit bowl');
}

function yogurtSnack(recipe) {
  return finish(recipe, [
    'Spoon the measured chilled yogurt or hung curd into a bowl and whisk for 20–30 seconds until smooth.',
    /cucumber/i.test(recipe.ingredients) ? 'Wash and grate the measured cucumber. Squeeze it gently to remove excess liquid so the curd stays thick.' : /berries|papaya|apple|pomegranate/i.test(recipe.ingredients) ? 'Wash and drain the fruit. Remove stems, peel, core or membranes where appropriate, then cut larger fruit into small cubes and weigh the listed portion.' : 'Set out the measured topping separately; keep dry toppings crisp until serving.',
    /Mishti/.test(recipe.title) ? 'Stir the date paste and cardamom into the yogurt until evenly colored. This is a quick assembled yogurt bowl, not a fermented mishti doi recipe.' : 'Fold in the fruit or cucumber and the listed seasoning. If the ingredient list offers berries or cinnamon, use one of those options.',
    'Add the measured seeds, boondi or roasted chana immediately before eating if listed. Serve the entire prepared bowl; dry toppings soften if left standing.',
  ], 8, 0, '1 serving · all the yogurt and measured toppings');
}

function chaat(recipe) {
  const title = recipe.title;
  if (/Papdi|Dahi Puri/.test(title)) return finish(recipe, [
    'Use the listed boiled potato, cooled and cut into small cubes. Whisk the measured curd until smooth and keep it chilled.',
    /Puri/.test(title) ? 'Arrange the 4 mini puris on a plate and make a small opening in the top of each without breaking the base.' : 'Arrange the 4 papdis in one layer on a small plate.',
    'Divide the potato evenly among the 4 pieces, then spoon the measured curd over the potato.',
    'Scatter the listed sev evenly over the top and serve immediately, while the bases are still crisp. This is one complete serving.',
  ], 10, 0, '1 serving · 4 topped pieces');
  const sprouts = /sprouts/i.test(recipe.ingredients);
  const crispy = /puffed|murmura|khakra|roasted peanuts/i.test(recipe.ingredients);
  return finish(recipe, [
    'Measure the ingredients. Wash the fresh produce and herbs, drain well and chop the vegetables or fruit into roughly 1 cm pieces.',
    fruitPrep(recipe.ingredients),
    sprouts
      ? 'Place the sprouts in a steamer basket above simmering water. Cover and steam for 10–15 minutes or longer until thoroughly cooked and tender all the way through; do not serve raw or merely warmed sprouts. Cool for 5 minutes and drain.'
      : /boiled/i.test(recipe.ingredients) && 'The ingredients marked boiled must already be fully cooked, tender and drained. Their cooking time is separate from this quick assembly recipe; do not substitute dry pulses.',
    crispy && 'Keep the roasted peanuts, puffed rice or broken khakra dry in a separate bowl until the final toss.',
    'Combine the prepared fruit, vegetables or cooked pulses in a bowl. Add the measured lemon or lime juice and the listed spices and herbs; fold gently to distribute the seasoning.',
    crispy && 'Fold in the crisp ingredients and any listed sev immediately before eating so they do not become soggy.',
    'Serve the complete mixture as one portion. Keep the dressing separate if preparing the chopped ingredients ahead.',
  ], sprouts ? 15 : 10, sprouts ? 15 : 0, '1 serving · the complete measured chaat');
}

function roasted(recipe) {
  if (/Air Fried/.test(recipe.title)) return finish(recipe, [
    'Wash the sweet potato and cut the measured portion into even 1.5 cm cubes. Pat dry so the surface can brown.',
    'Preheat the air fryer to 190°C for 3 minutes. Toss the cubes with the listed 1 tsp oil, reserving the chaat masala, chilli and lemon.',
    'Spread in a single layer and air-fry for 12–18 minutes, shaking halfway through. The edges should be lightly golden and the center should yield easily to a fork.',
    'Transfer to a bowl and toss with the measured spices and lemon juice. Rest for 2 minutes and serve the full portion warm.',
  ], 8, 20, '1 serving · all the cooked sweet potato');
  if (/Flax Crackers/.test(recipe.title)) return finish(recipe, [
    'Count the 4 ready-to-eat flax crackers and measure 2 tbsp salsa into a small dipping bowl.',
    'Arrange the crackers on a plate. Keep the salsa separate so the crackers stay crisp.',
    'Dip each cracker immediately before eating. The crackers and measured salsa together make one serving; no additional cooking is required.',
  ], 3, 0, '1 serving · 4 crackers with 2 tbsp salsa');
  if (/Corn Cup/.test(recipe.title)) return chaat(recipe);
  const makhana = /makhana/i.test(recipe.title);
  return finish(recipe, [
    `Measure the first ingredient (${lines(recipe)[0]}) into a clean, dry frying pan. Use the ready-roasted product when specified, not raw dried pulses.`,
    `Toast over medium-low heat for ${makhana ? '5–7' : '2–3'} minutes, stirring continuously to prevent dark spots. ${makhana ? 'A cooled piece should break with a crisp snap, not bend or feel chewy.' : 'Stop when fragrant and crisp; the ingredients are already cooked and only need refreshing.'}`,
    /\boil\b/.test(recipe.ingredients) && 'Add the measured oil and toss for 1 minute so it coats the pieces evenly.',
    'Switch off the heat and sprinkle in the measured dry seasonings. Toss while the pan is still warm; do not fry the spice powders.',
    /lemon/.test(recipe.ingredients) && 'Add the measured lemon juice just before eating. Include the optional chopped onion and coriander only if listed and desired.',
    'Cool for 2 minutes and transfer the entire measured portion to a bowl. Keep any unseasoned dry ingredients separate from moist toppings.',
  ], 5, makhana ? 8 : 3, '1 serving · the complete measured snack');
}

function sundal(recipe) {
  const sprouts = /sprouts/i.test(recipe.ingredients);
  return finish(recipe, [
    sprouts
      ? 'Steam the measured sprouts in a basket over simmering water for 10–15 minutes or longer, until thoroughly cooked and tender. Drain well; raw sprouts are not used in this recipe.'
      : 'Use the measured fully boiled pulses, peanuts or corn specified in the ingredients. Drain well; a pulse should crush easily between a spoon and the side of a bowl. Soaking and boiling dried pulses is not included in this quick recipe.',
    'Wash the curry leaves and chilli, then pat them dry. Slit the chilli lengthways; grate the measured coconut if not already grated.',
    'Warm the listed oil in a small pan over medium heat. Add mustard seeds, cover loosely and let them pop for about 30 seconds. Lower the heat and carefully add the curry leaves and chilli; stir for 20 seconds.',
    /carrot/.test(recipe.ingredients) && 'Finely grate the carrot, add it to the pan and cook for 3 minutes over low heat, stirring until softened.',
    'Add the drained cooked main ingredient. Toss over medium-low heat for 2–3 minutes until hot throughout and evenly coated with the tempering.',
    'Turn off the heat. Fold in all the listed coconut and lemon juice, then serve the entire mixture warm in one bowl.',
  ], 8, sprouts ? 20 : /carrot/.test(recipe.ingredients) ? 8 : 5, '1 serving · the complete sundal bowl');
}

function steamedSnack(recipe) {
  if (recipe.title === 'Steamed Corn on Cob') return finish(recipe, [
    'Remove the husk and silk from the measured small corn cob and rinse it.',
    'Add water to a steamer pan to a depth of 3 cm, keeping it below the basket. Bring to a simmer, place the cob in the basket and cover.',
    'Steam for 10–15 minutes, turning once, until the kernels are plump and tender when pierced. Lift out with tongs and cool for 2 minutes.',
    'Rub the measured lemon juice and chaat masala over the warm cob. Serve the whole small cob as one portion.',
  ], 5, 15, '1 serving · 1 small seasoned corn cob');
  return finish(recipe, [
    `This is a reheating-and-serving recipe: start with the fully cooked prepared item (${lines(recipe)[0]}), not raw batter or uncooked dough. Measure the chutney separately.`,
    'Pour water into a steamer pan to a depth of 3 cm, below the basket. Bring to a simmer. Arrange the pieces in a single layer on a heatproof plate in the basket.',
    'Cover and steam for 5–8 minutes, until piping hot through the center; refrigerated leftovers should reach 74°C / 165°F. Follow packet heating directions for frozen products.',
    'Lift the plate out carefully and rest for 1 minute. Serve every measured piece with the listed chutney on the side.',
  ], 5, 8, `1 serving · ${lines(recipe)[0]} plus the measured chutney`);
}

function nutSnack(recipe) {
  const title = recipe.title;
  if (PAIRS.has(title) || /Trail Mix/.test(title)) return finish(recipe, [
    'Weigh or count each ingredient separately using the quantities listed; nut sizes vary, so the gram weights are the guide when provided.',
    /dates|fig/i.test(recipe.ingredients) ? 'Check that every date is pitted and trim tough dried fig stalks. Chop the dried fruit into bite-size pieces or serve it whole alongside the nuts.' : 'Check the nuts and seeds for shell fragments. Use the ready-to-eat or roasted forms specified in the ingredient list.',
    'Combine the measured ingredients in a small bowl. Keep the mixture dry; no oil, syrup or extra seasoning is required.',
    'Serve the complete measured mixture as one snack portion. Close the ingredient packets before serving to keep the portion clear.',
  ], 5, 0, '1 serving · all the measured nuts, seeds or dried fruit');
  if (title === 'Peanut Chikki Light') return finish({ ...recipe, ingredients: /1 tsp water/.test(recipe.ingredients) ? recipe.ingredients : `${recipe.ingredients}\n1 tsp water` }, [
    'Set a piece of baking parchment on a heatproof board. Roughly chop the measured roasted peanuts and keep them next to the stove.',
    'Combine the measured jaggery and 1 tsp water in a small heavy pan. Warm over low heat, stirring until dissolved, then simmer for 2–3 minutes.',
    'Drop a little syrup into cold water: it should harden and snap when cooled. If still soft, cook for another 30 seconds and test again. Do not touch hot syrup.',
    'Switch off the heat, quickly fold in the peanuts and scrape onto the parchment. Cover with a second piece and flatten with a rolling pin.',
    'Cool for 10 minutes until firm, then remove the paper and break into 2 pieces. Both pieces together are one serving.',
  ], 15, 5, '1 serving · 2 small pieces from the complete mixture');
  if (/Ladoo/.test(title)) return finish(recipe, [
    'Measure the flour or oat powder, the listed binder and the ghee separately. Finely grate jaggery or mash pitted dates, according to the ingredient list.',
    /Ragi/.test(title) ? 'Dry-roast the ragi flour in a small pan over low heat for 8–10 minutes, stirring constantly, until fragrant and no longer raw-smelling. Do not brown it heavily.' : /Besan/.test(title) ? 'Warm the already-roasted besan over low heat for 2–3 minutes, stirring until fragrant. If starting with raw besan instead, roast it thoroughly before measuring for this recipe.' : 'Toast the oat powder over low heat for 3–4 minutes, stirring constantly, until fragrant and lightly colored.',
    'Add the measured ghee and stir for 1 minute, then remove the pan from the heat. Let it cool for 2 minutes before mixing in the jaggery or mashed dates.',
    'Press the mixture firmly with a spoon to distribute the binder. Divide into 2 equal portions and compress each firmly in your palm before rolling.',
    'Rest for 10 minutes to firm up. If the low-ghee mixture will not hold its shape, serve it as 2 measured spoonfuls rather than adding unlisted fat or sweetener.',
  ], 15, /Ragi/.test(title) ? 12 : 5, '1 serving · 2 small ladoos, using the complete mixture');
  return finish(recipe, [
    'Check the dates for pits. Cover firm dates with warm water for 10 minutes, then drain thoroughly; excess soaking water makes the mixture loose.',
    /oats/i.test(recipe.ingredients) ? 'Pulse the measured oats into a coarse meal in a small grinder. Add the measured dates, nut butter, flaxseed and cocoa if using it.' : 'Finely chop the measured nuts and mash the dates with a fork, or pulse them together in a small grinder until coarse and sticky. A large blender may not catch this small batch.',
    /coconut/i.test(recipe.ingredients) && 'Mix in the measured coconut, reserving it for the outside only if the ingredient list specifies a coating.',
    /ghee/i.test(recipe.ingredients) && 'Mix in the listed optional ghee only if using it; it is not essential when the dates are soft and sticky.',
    'Press a spoonful together: it should hold its shape. Mash or pulse again to distribute the dates if the mixture crumbles; do not add unmeasured nuts or oats.',
    'Divide the complete mixture into 2 equal portions and press firmly into balls. Roll in the optional measured coconut coating if listed.',
    'Chill for 20 minutes to firm up. Both balls together are one serving; their weight is the total of the ingredients used.',
  ], 40, 0, '1 serving · 2 balls from the complete measured mixture');
}

function eggSnack(recipe) {
  const title = recipe.title;
  const base = 'Wash your hands and utensils after handling raw eggs. Cook egg mixtures until the center reaches 71°C / 160°F and no liquid egg remains.';
  if (title === 'Boiled Eggs') return finish(recipe, [
    'Place the eggs in a small saucepan and add cold water to cover them by 2 cm. Bring to a gentle boil over medium heat.',
    'Lower the heat and simmer for 10–12 minutes. The whites and yolks must both be firm, not runny.',
    'Transfer the eggs to cold water for 5 minutes, then tap the shells and peel carefully. Rinse off shell fragments and halve the eggs.',
    'Sprinkle with the measured pepper and chaat masala. Serve both eggs with the cucumber slices if using the optional measured portion.',
  ], 8, 15, '1 serving · 2 hard-boiled eggs');
  if (title === 'French Toast Light') return finish(recipe, [
    'Whisk the egg, measured milk and cinnamon in a shallow bowl until no streaks of egg white remain.',
    'Heat a good nonstick frying pan over medium-low heat. Dip the bread into the egg mixture for 10 seconds on each side; let excess drip back into the bowl.',
    'Place the bread in the pan. Spoon the remaining measured egg mixture onto and around it; cook for 3–4 minutes per side, lowering the heat if it browns too quickly.',
    base,
    'Transfer the toast and any cooked egg alongside it to a plate. Serve warm as one portion; no syrup or extra toppings are included.',
  ], 5, 8, '1 serving · 1 slice of French toast and its cooked egg mixture');
  if (title === 'Egg Muffin Vegetable') return finish(recipe, [
    'Preheat the oven to 180°C. Brush 2 small muffin cups with the measured oil, coating the bases and sides.',
    'Wash and finely dice the measured vegetables into 5 mm pieces. Whisk the eggs until uniform and stir in the vegetables.',
    'Divide between the 2 cups and bake for 15–20 minutes, until the centers are set and reach 71°C / 160°F. Oven time varies with the depth of the cups.',
    'Rest for 3 minutes, loosen the edges with a spoon and lift out. Both muffins together make one serving.',
  ], 15, 20, '1 serving · 2 small egg muffins');
  if (/White Cup|Bhurji Toast/.test(title)) {
    const eggIngredients = recipe.ingredients.replace(', scrambled', ', raw, beaten');
    recipe = { ...recipe, ingredients: /1 tbsp water/.test(eggIngredients) ? eggIngredients : `${eggIngredients}\n1 tbsp water, for softening the vegetables` };
    return finish(recipe, [
      'Finely chop the measured tomato or onion. Beat the eggs or egg whites in a bowl; add the listed salt if present.',
      'Warm a good nonstick pan over medium-low heat. Add the chopped vegetables with 1 tbsp water and stir for 2–3 minutes until softened and the water has evaporated.',
      'Pour in the egg and stir gently, scraping the bottom with a spatula for 3–4 minutes until soft curds form.',
      base,
      /Toast/.test(title) ? 'Toast the measured bread until lightly crisp, then spoon all the cooked egg mixture over it and serve immediately.' : 'Spoon the complete egg-white mixture into a small bowl and serve warm.',
    ], 5, 7, /Toast/.test(title) ? '1 serving · 1 topped toast' : '1 serving · the complete egg-white bowl');
  }
  return finish(recipe, [
    'Start with the listed hard-boiled eggs: both yolks and whites should be firm. Peel, check for shell fragments and chop or slice as specified. Boiling and cooling time is additional if the eggs are not already cooked.',
    /Lettuce/.test(title) ? 'Wash and pat the lettuce leaves dry. Fold the chopped eggs with the measured hung curd and pepper.' : 'Mix the eggs gently with the listed seasoning and chopped onion, lemon or cucumber where present.',
    /Lettuce/.test(title) ? 'Divide the complete egg mixture between the 2 lettuce leaves and fold the edges around the filling.' : /Sandwich/.test(title) ? 'Lightly toast the measured bread for 2 minutes, then arrange the sliced egg and cucumber over the top.' : 'Arrange all the seasoned eggs in a small bowl without adding extra sauces.',
    'Serve immediately as the complete measured portion.',
  ], 8, /Sandwich/.test(title) ? 2 : 0, /Lettuce/.test(title) ? '1 serving · 2 filled lettuce cups' : /Sandwich/.test(title) ? '1 serving · 1 open sandwich' : '1 serving · all the measured eggs');
}

function sandwich(recipe) {
  const title = recipe.title;
  recipe = { ...recipe, ingredients: recipe.ingredients.replace('shredded chicken', 'fully cooked shredded chicken') };
  return finish(recipe, [
    'Wash the fresh vegetables, pat dry and slice thinly. Measure the bread and filling; use the cooked egg, chicken, corn or spinach specified in the ingredients, not raw substitutes.',
    'Toast the bread in a dry pan over medium-low heat for 1–2 minutes per side, until lightly crisp. Allow it to cool for 1 minute before adding a cold filling.',
    /chutney|hummus|hung curd/i.test(recipe.ingredients) ? 'Spread the measured chutney, hummus or hung curd evenly across the bread. Keep the spread within the edges to prevent dripping.' : 'Place the measured filling in a small bowl. Break paneer or tofu into small crumbles if listed, and keep sliced cheese separate for layering.',
    /paneer|tofu/i.test(recipe.ingredients) && 'Use ready-to-eat pasteurized paneer or packaged ready-to-eat tofu; otherwise cook it according to its packet directions before assembling.',
    'Distribute the measured filling and vegetables evenly over the bread. Add only the seasonings in the ingredient list; do not add an extra spread.',
    /Open/.test(title) ? 'Serve as one open-faced sandwich with all the filling on the single slice.' : 'Close with the second slice and press gently. Cut diagonally and serve both halves as one portion.',
  ], 10, 4, /Open/.test(title) ? '1 serving · 1 open-faced sandwich' : '1 serving · 1 sandwich, cut into 2 halves');
}

export function detailDrinkOrSnack(recipe) {
  if (recipe.mealType === 'Smoothies') return /Smoothie$/.test(recipe.title) || / Mint Cooler$/.test(recipe.title) ? smoothie(recipe) : otherDrink(recipe);
  if (recipe.mealType !== 'Snack') return recipe;
  if (FRUIT_SNACKS.has(recipe.title)) return fruitSnack(recipe);
  if (YOGURT_SNACKS.test(recipe.title)) return yogurtSnack(recipe);
  if (STEAMED_SNACKS.has(recipe.title)) return steamedSnack(recipe);
  if (/Sundal|Masala Sprouts Cup/.test(recipe.title)) return sundal(recipe);
  if (/Sandwich/.test(recipe.title) && recipe.title !== 'Egg Open Sandwich') return sandwich(recipe);
  if (/Egg|French Toast/.test(recipe.title)) return eggSnack(recipe);
  if (PAIRS.has(recipe.title) || /Trail Mix|Bites|Ladoo|Chikki|Protein Balls/.test(recipe.title)) return nutSnack(recipe);
  if (recipe.title === 'Hummus with Vegetables') return finish(recipe, [
    'Measure 2 tbsp of prepared hummus into a small bowl. This recipe uses ready-made hummus, not a separate batch of chickpeas.',
    'Wash the vegetables. Peel the carrot and remove the capsicum seeds. Cut the measured cucumber, carrot and capsicum into finger-length sticks of similar thickness.',
    'If the hummus is thick, stir in the measured 1 tsp lemon juice until smooth enough for dipping.',
    'Arrange all the vegetable sticks around the hummus and serve. The complete plate is one serving.',
  ], 10, 0, '1 serving · 2 tbsp hummus with 150 g vegetable sticks');
  if (/Chaat|Sprouts Salad|Bhel|Murmura/.test(recipe.title) && !/Air Fried/.test(recipe.title)) return chaat(recipe);
  return roasted(recipe);
}
