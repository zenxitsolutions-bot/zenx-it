function serve(recipe) {
  return `Serve exactly: ${recipe.portionSize}.`;
}

function existingSteps(recipe) {
  return String(recipe.instructions)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);
}

const CORE_TITLES = new Set([
  'Vegetable Upma',
  'Oats Upma',
  'Poha',
  'Vegetable Poha',
  'Idli',
  'Ragi Idli',
  'Vegetable Dosa',
  'Ragi Dosa',
  'Oats Dosa',
  'Moong Dal Chilla',
  'Besan Chilla',
  'Vegetable Uttapam',
  'Healthy Paratha',
  'Paneer Paratha',
  'Methi Paratha',
  'Oats Porridge',
  'Millet Porridge',
  'Vegetable Sandwich',
  'Egg Bhurji',
  'Boiled Eggs with Vegetables',
]);

export function coreBreakfastSteps(recipe) {
  if (!recipe || !CORE_TITLES.has(recipe.title)) return null;

  switch (recipe.title) {
    case 'Vegetable Upma':
      return [
        'Dry-roast the 40 g rava over medium-low heat for 3-4 minutes until fragrant without browning, then transfer it to a plate.',
        'Heat the 1 tsp oil over medium heat. Crackle mustard seeds, then cook the optional chana dal, curry leaves and green chilli for 30-45 seconds until the dal is light golden.',
        'Add the measured carrot, beans, peas and capsicum; cook 2-3 minutes until the vegetables soften slightly.',
        'Pour in 300 ml water and salt. When it reaches a rolling boil, rain in the roasted rava while stirring continuously to prevent lumps.',
        'Cover and cook on low for 3 minutes. Rest 2 minutes, fluff with a fork, garnish with coriander, and serve with 30 g coconut chutney.',
        serve(recipe),
      ];
    case 'Oats Upma':
      return [
        'Pulse large rolled oats once so they cook evenly; leave them coarse rather than grinding them into flour.',
        'Heat the 1 tsp oil over medium heat. Crackle mustard, then cook curry leaves, chilli, carrot, beans, peas and onion for 2-3 minutes.',
        'Stir in oats and turmeric for 30-40 seconds so the flakes are coated without becoming dry.',
        'Add 250 ml water and salt. Simmer uncovered on low-to-medium heat for 6-8 minutes, stirring every minute, until the oats are tender but still textured.',
        'Turn off the heat, fold in lemon juice, rest 1 minute, and serve with 30 g coconut chutney.',
        serve(recipe),
      ];
    case 'Poha':
      return [
        'Rinse the 50 g thick poha in a fine sieve for 5 seconds, drain fully, and rest it 5 minutes until the flakes are moist but intact.',
        'Heat the 1 tsp oil over medium heat and crackle mustard seeds. Add onion and peas and cook 3 minutes until the onion turns translucent and the peas are hot.',
        'Stir in turmeric and salt, then fold in the drained poha gently for 2 minutes so the flakes do not break.',
        'Turn off the heat, mix in the measured lemon juice, and serve while the poha is warm and separate.',
        serve(recipe),
      ];
    case 'Vegetable Poha':
      return [
        'Rinse the 50 g thick poha briefly in a fine sieve, drain fully, and rest it 5 minutes until the flakes soften without becoming soggy.',
        'Heat the 1 tsp oil over medium heat, crackle mustard seeds, then cook carrot, beans and peas for 4 minutes until the beans lose their raw bite.',
        'Add turmeric and salt. Fold in the drained poha for 2 minutes with a light hand, keeping the flakes whole.',
        'Turn off the heat, fold in lemon juice and the optional measured roasted peanuts, and check that the mixture is hot throughout.',
        serve(recipe),
      ];
    case 'Idli':
      return [
        'Bring the steamer water to a steady boil. Stir the 120 g fermented idli batter once without deflating it.',
        'Lightly spray three idli moulds with the listed oil and divide the batter equally between them.',
        'Steam with the lid closed for 10-12 minutes. The idlis are done when the centre springs back and a toothpick comes out clean.',
        'Rest 2 minutes, loosen the edges with a spoon, and unmould while they are still warm.',
        'Serve with 15 g coconut chutney. If using the optional 50 g sambar, warm it separately until steaming.',
        serve(recipe),
      ];
    case 'Ragi Idli':
      return [
        'Whisk the 80 g ragi flour, 40 g fermented idli or urad batter, salt, and 60 ml processing water until no dry ragi remains.',
        'Rest the mixture 20 minutes so the ragi hydrates; it should fall from a spoon in a thick ribbon, not a stiff lump.',
        'Lightly oil three idli moulds with the measured 0.5 tsp oil and divide the batter evenly.',
        'Steam over steadily boiling water for 12 minutes. The idlis are ready when the centre springs back and a skewer comes out clean.',
        'Rest 2 minutes before unmoulding so the tender ragi idlis release cleanly.',
        serve(recipe),
      ];
    case 'Vegetable Dosa':
      return [
        'Heat a non-stick tawa over medium-high heat until a water drop sizzles and disappears.',
        'Pour the 80 g fermented dosa batter in the centre and spread it into one thin circle. Scatter onion, tomato, capsicum, salt and cumin while the surface is still wet.',
        'Drizzle the 1 tsp oil around the edge. Cook 2 minutes until the base is crisp and the edges lift easily.',
        'Turn once for about 1 minute until the vegetables are hot and softened, then fold without tearing.',
        'Warm the measured 50 g sambar until steaming; plate 15 g coconut chutney separately.',
        serve(recipe),
      ];
    case 'Ragi Dosa':
      return [
        'Whisk ragi flour, rice flour, 150 ml water, cumin and salt until smooth. Rest 10 minutes so the flours hydrate fully.',
        'Heat a non-stick tawa over medium-high heat. Stir the batter once, pour it in the centre, and spread it into one thin circle.',
        'Scatter the optional measured onion over the wet surface and drizzle the 1 tsp oil around the edge.',
        'Cook 2-3 minutes until the base is crisp and the top is dry, then turn for 45-60 seconds.',
        'Warm the 50 g sambar and serve the dosa while its edges are crisp.',
        serve(recipe),
      ];
    case 'Oats Dosa':
      return existingSteps(recipe);
    case 'Moong Dal Chilla':
      return [
        'Drain the moong dal after its 2-hour soak. Grind it with ginger, cumin, optional green chilli and salt, adding up to 60 ml water gradually to help the grinder run. Soaking is additional to the active preparation time shown.',
        'The batter should be thick and slightly grainy. Fold in onion, tomato and spinach immediately before cooking.',
        'Heat a non-stick tawa over medium heat and brush it with half the measured oil. Spread half the batter into a 15 cm circle.',
        'Cook 2-3 minutes until the underside is golden and the top looks set, then turn and cook 1-2 minutes. Repeat for the second chilla.',
        'Stir the measured lemon juice through the mint-coriander chutney just before plating.',
        serve(recipe),
      ];
    case 'Besan Chilla':
      return [
        'Whisk besan, 80 ml water, ajwain, turmeric and salt until completely lump-free. Rest 5 minutes so the batter thickens slightly.',
        'Fold in the measured onion, tomato and capsicum. The batter should coat a spoon but still spread easily.',
        'Heat a non-stick tawa over medium heat and brush it with half the 1 tsp oil. Spread half the batter into a 15 cm round.',
        'Cook 2-3 minutes until the centre sets and the underside has brown spots; turn and cook 1-2 minutes. Repeat for the second chilla.',
        'Plate the measured 15 g mint-coriander chutney separately and serve with the warm chillas.',
        serve(recipe),
      ];
    case 'Vegetable Uttapam':
      return [
        'Heat a non-stick tawa over medium heat and brush it with half the measured oil.',
        'Pour the 80 g fermented dosa batter into one thick 15 cm round. Press onion, tomato, capsicum, coriander and salt into the top.',
        'Drizzle the remaining half of the measured oil around the edge, cover, and cook 3 minutes until the base is golden and the top is almost set.',
        'Turn once and cook 2 minutes until the vegetables soften and the centre is cooked through but still tender.',
        serve(recipe),
      ];
    case 'Healthy Paratha':
      return [
        'Rinse the 40 g dal. Bring it to a boil with 160 ml water and turmeric, then simmer covered until it crushes easily, allowing about 20-30 minutes for moong or 35-45 minutes for toor. Add 30 ml hot water if it dries before softening. Temper cumin in 0.25 tsp of the measured oil and stir it through.',
        'Mix whole-wheat flour, carrot, methi, ajwain, salt and 30 ml water into a soft dough. Rest 10 minutes.',
        'Roll one 18 cm paratha. Cook on a medium-hot tawa with the remaining 0.75 tsp oil for about 2 minutes per side until brown spots appear and the centre is dry.',
        'Keep the cooked dal hot and prepare the stated cucumber-tomato salad immediately before serving.',
        serve(recipe),
      ];
    case 'Paneer Paratha':
      return [
        'Knead whole-wheat flour, salt and 30 ml water into a soft dough. Rest it 10 minutes under a covered bowl.',
        'Mix the 50 g crumbled paneer with cumin powder and chilli powder until evenly seasoned.',
        'Roll the dough into a small disc, enclose the paneer filling, seal the edges, and roll gently into one paratha without breaking the surface.',
        'Cook on a medium-hot tawa with the measured 1 tsp oil for about 2 minutes per side, until both sides have brown spots and the filling is hot.',
        'Stir the listed 30 g prepared cucumber raita and prepare the stated 80 g cucumber-tomato salad.',
        serve(recipe),
      ];
    case 'Methi Paratha':
      return [
        'Mix whole-wheat flour, fresh methi, ajwain, salt and 30 ml water into one soft dough; the methi stays mixed through the dough rather than becoming a stuffed centre.',
        'Rest 10 minutes, then roll the dough into one thin paratha.',
        'Cook on a medium-hot tawa with the measured 1 tsp oil until dry brown spots appear on both sides and the centre is cooked.',
        'Stir the measured lemon juice through the mint-coriander chutney immediately before plating.',
        serve(recipe),
      ];
    case 'Oats Porridge':
      return [
        'Bring the 200 ml low-fat milk to a gentle simmer over low heat; do not let it boil hard.',
        'Stir in the 40 g rolled oats and cook 6-8 minutes, stirring from the base every minute until the oats are tender and the porridge coats a spoon.',
        'Spoon into the stated bowl and top with the listed banana or berries and flaxseed.',
        'Serve warm without adding sugar.',
        serve(recipe),
      ];
    case 'Millet Porridge':
      return [
        'Rinse the 40 g foxtail or little millet in a fine sieve and drain well.',
        'Bring the 250 ml water and the listed salt or cardamom to a gentle boil. Add millet, cover loosely, and simmer on low for 12-15 minutes.',
        'Stir twice from the base. It is ready when the grains are tender and the porridge is creamy rather than watery.',
        'Rest 2 minutes, top with the measured chopped almonds, and serve warm.',
        serve(recipe),
      ];
    case 'Vegetable Sandwich':
      return [
        'Pat cucumber, tomato, onion and lettuce dry so their moisture does not soften the bread.',
        'Toast the two whole-wheat slices lightly over medium heat until the edges are dry but not hard.',
        'Spread the measured mint-coriander chutney evenly over both slices, then layer cucumber, tomato, onion and lettuce from edge to edge.',
        'Close, press gently, cut once, and serve immediately while the bread remains crisp.',
        serve(recipe),
      ];
    case 'Egg Bhurji':
      return [
        'Knead the whole-wheat flour and 40 ml water into a soft dough. Rest 10 minutes, divide into two balls, roll thin, and cook the phulkas on a dry hot tawa until they puff.',
        'Heat the 1 tsp oil over medium heat. Cook onion 1 minute, then tomato and capsicum 2 minutes until the tomato softens.',
        'Beat the two eggs with turmeric, chilli powder and salt. Pour into the pan and stir gently for 2-3 minutes until soft curds form with no liquid egg.',
        'Turn off the heat while the bhurji is still moist and fold in coriander.',
        'Keep the phulkas covered so they stay soft until plating.',
        serve(recipe),
      ];
    case 'Boiled Eggs with Vegetables':
      return [
        'Place the two eggs in cool water, bring it to a boil, then cook 9 minutes for firm yolks.',
        'Cool the eggs under running water, peel, and halve them lengthwise.',
        'Toss cucumber, tomato and mixed greens with the measured lemon juice, black pepper and salt immediately before serving.',
        'Arrange the fully set egg halves over the fresh salad and serve immediately.',
        serve(recipe),
      ];
    default:
      return null;
  }
}
