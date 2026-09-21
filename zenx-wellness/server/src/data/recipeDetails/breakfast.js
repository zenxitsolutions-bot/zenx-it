// Breakfast detail layer. The catalog remains the source of truth for every
// ingredient amount, side, portion, nutrition value, diet, tag, and image.

import { coreBreakfastSteps } from './coreBreakfastSteps.js';

function numbered(lines) {
  return lines
    .map((line) => String(line).replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
    .map((line, index) => `${index + 1}. ${line}`)
    .join('\n');
}

const serve = () => 'Serve the original stated portion with all the measured sides in the ingredient list.';

function grainTiming(title, form) {
  if (/oats/i.test(title)) return form === 'porridge' ? '6-8 minutes' : '4-6 minutes';
  if (/ragi/i.test(title)) return form === 'porridge' ? '6-8 minutes for flakes or 15-18 minutes for groats' : '6-8 minutes';
  if (/brown rice/i.test(title)) return form === 'porridge' ? '8-10 minutes for flakes or 25-30 minutes for soaked groats' : '12-15 minutes';
  if (/jowar|bajra/i.test(title)) return form === 'porridge' ? '10-12 minutes for flakes or 20-25 minutes for soaked groats' : '10-12 minutes';
  if (/quinoa/i.test(title)) return '12-14 minutes';
  return form === 'porridge' ? '10-12 minutes for flakes or 20-25 minutes for soaked groats' : '12-14 minutes';
}

function hasPreparedBatter(recipe) {
  return /\bbatter\b/i.test(recipe.ingredients) && !/\bflour\b/i.test(recipe.ingredients);
}

function ravaIdliSteps() {
  return [
    'Choose one route: make the three small idlis from 60 g prepared rava batter and 30 g finely chopped vegetables, or use the three already-prepared rava idlis. The listed three idlis describe the serving, not three additional idlis alongside the batter.',
    'For the batter route, fold the vegetables into the batter without adding water. Divide between three small moulds and steam over boiling water for 10-12 minutes, until a skewer comes out clean. Rest 2 minutes before unmoulding.',
    'For the prepared-idli route, steam the idlis for 4-5 minutes until hot through the centre; steam the measured vegetables alongside them until tender.',
    'Warm 120 g sambar separately until simmering. Serve the three idlis with the sambar and 2 tbsp coconut chutney.',
    serve(),
  ];
}

function porridgeSteps(recipe) {
  const grain = recipe.title.replace(/\s+Porridge$/i, '').toLowerCase();
  return [
    `For ${grain}, use the listed flakes directly; if using groats, rinse and soak them 6 hours in the refrigerator before draining and cooking. This soaking is additional to the active preparation time shown.`,
    `Add 250 ml water when the ingredient list has no liquid, then simmer on low heat for ${grainTiming(recipe.title, 'porridge')}, stirring from the base.`,
    'Cook every listed chopped vegetable and seasoning in the listed cooking fat until softened, then fold them into the tender grain for 1 minute.',
    'The porridge is ready when the grain crushes easily with a spoon and the mixture still flows slowly. If the groats remain firm, add 30 ml hot water and simmer another 5 minutes; repeat until tender, following the grain package for longer-cooking varieties.',
    serve(),
  ];
}

function upmaSteps(recipe) {
  return [
    'Dry-roast the listed grain, rava, or broken cereal over medium-low heat for 2-3 minutes until fragrant; set it aside before tempering.',
    'Heat the measured oil and let the mustard seeds begin to pop. Add every listed chopped vegetable and the remaining seasonings; cook for 4-5 minutes until the vegetables soften.',
    `Add 240 ml water, bring it to a boil, stir in the roasted grain steadily, cover, and cook on low for ${grainTiming(recipe.title, 'upma')}.`,
    'Rest covered 2 minutes and fluff with a fork; the grains should be tender and separate rather than pasty.',
    serve(),
  ];
}

function pohaSteps() {
  return [
    'Rinse the listed poha or flakes briefly, drain fully, and rest 5 minutes until they bend without becoming mushy.',
    'Heat the measured oil over medium heat and let the mustard seeds begin to pop. Add every listed chopped vegetable and the remaining seasonings; cook for 4-5 minutes until softened.',
    'Fold in the softened flakes for 2-3 minutes with a light hand so they remain separate.',
    serve(),
  ];
}

function idliSteps() {
  return [
    'Finely chop or grate the listed vegetables. If mustard seeds are listed, heat the measured oil, let the seeds begin to pop, and soften the vegetables with the remaining seasonings for 3-4 minutes. Let this mixture cool.',
    'Fold the cooled vegetable mixture gently into the listed prepared batter. Keep the batter thick and airy rather than diluting it with extra water.',
    'Fill clean idli moulds to three-quarters full and steam 10-12 minutes over steadily boiling water with the lid closed.',
    'The idlis are done when the centre springs back and a skewer comes out clean; rest 2 minutes before unmoulding.',
    serve(),
  ];
}

function dosaSteps() {
  return [
    'Heat a non-stick tawa over medium-high heat and spread the listed batter into a thin, even round.',
    'Add every listed chopped vegetable, filling and seasoning while the surface is wet, using only the listed cooking fat around the edge.',
    'Cook for 2-3 minutes until the base is crisp, the edge releases easily, and the top has no wet batter. Turn for 30-60 seconds if the vegetable topping needs further cooking, then fold.',
    serve(),
  ];
}

function setDosaSteps() {
  return [
    'Heat a non-stick tawa over medium heat. Divide 100 g thick batter into two small rounds without spreading it thin, using the measured 1 tsp oil across both dosas.',
    'Cover and cook for 2-3 minutes until the top is set with small bubbles visible and the underside is pale golden rather than crisp.',
    'Turn once for 30-60 seconds, keeping each set dosa soft and tender.',
    serve(),
  ];
}

function uttapamSteps() {
  return [
    'Heat a non-stick tawa over medium heat and pour the listed batter into a thick round.',
    'Press every listed chopped vegetable, filling and seasoning into the surface. Drizzle the measured oil around the edge and cook covered for 3-4 minutes until the base is golden and the top is almost set.',
    'Turn once and cook for 1-2 minutes until the topping is hot and softened and no wet batter remains in the centre. Keep the centre tender rather than crisp.',
    serve(),
  ];
}

function chillaSteps(recipe) {
  const prepared = hasPreparedBatter(recipe);
  return [
    prepared
      ? 'Stir the listed prepared batter gently; add no more than 15 ml water only when it does not fall from the spoon in a thick ribbon.'
      : 'Whisk the listed dry flour with every listed liquid; where no liquid is listed, add 80 ml water. Rest the batter 5 minutes.',
    'Fold in every listed chopped vegetable, seasoning and title ingredient immediately before cooking.',
    'Spread the batter on a medium-hot non-stick tawa using only the listed cooking fat. Cook for 2-3 minutes until the centre sets and the underside has brown spots; turn once and cook another 1-2 minutes until no wet batter remains.',
    serve(),
  ];
}

function parathaSteps() {
  return [
    'Knead the measured 80 g flour with 45 ml water into a soft dough; cover and rest 10 minutes. If dry flour remains, work in another 5 ml water.',
    'Use the measured 80 g spiced filling. If it releases liquid, heat it in a dry non-stick pan for 2-3 minutes until that liquid evaporates, then cool before stuffing.',
    'Divide the dough and filling into two equal portions. Flatten each dough ball, enclose one portion of filling, pinch the seam closed, and gently roll between sheets so the filling does not escape.',
    'Cook each paratha on a medium-hot tawa for 2-3 minutes per side, using the listed 1 tsp oil across both breads. Both sides should have brown spots, the dough should have no raw patches, and the filling should be hot.',
    serve(),
  ];
}

function theplaSteps() {
  return [
    'Mix 80 g whole-wheat flour with the listed 80 g spiced vegetable or paneer mixture and 45 ml water into a soft dough. For this thepla, the mixture labelled filling is worked through the dough.',
    'Cover and rest 10 minutes. Divide into two equal balls and roll each into a thin round between sheets; peel carefully onto the tawa.',
    'Cook on a medium-hot tawa for 2-3 minutes per side, sharing the measured 1 tsp oil across both breads, until brown spots appear and the centre has no raw dough.',
    serve(),
  ];
}

function specialSteps(recipe) {
  const lower = recipe.title.toLowerCase();
  if (lower.includes('puttu')) {
    return [
      'Sprinkle 30 ml water over the listed puttu flour and rub it with fingertips until it holds when pressed but breaks apart when released.',
      'Layer the moistened flour and listed coconut loosely in a puttu mould; do not compact the flour.',
      'Steam over steadily boiling water for 8-10 minutes until steam rises through the top and the flour smells cooked.',
      serve(),
    ];
  }
  if (lower.includes('idiyappam')) {
    return [
      'Keep the listed idiyappam nests intact; this recipe reheats prepared nests rather than turning them into appam batter.',
      'Place the nests in a steamer over boiling water and steam 5-7 minutes until the strands are soft and hot throughout.',
      'Warm the listed stew separately until it reaches a gentle simmer.',
      serve(),
    ];
  }
  if (lower.includes('appam')) {
    return [
      'For two appams, use the listed 80 g batter total. Warm an appam pan over medium heat, distribute the measured coconut oil across both appams, and stir the batter once without beating out its air.',
      'Pour half the batter, swirl once to make a thin edge, cover, and cook 2-3 minutes without flipping.',
      'The appam is ready when the centre is set, the edge is lacy, and the underside releases cleanly; repeat for the remaining batter.',
      serve(),
    ];
  }
  if (lower.includes('adai')) {
    return [
      'Stir the listed lentil-rice batter with every listed seasoning until it pours in a thick ribbon.',
      'Heat a non-stick tawa over medium heat, spread the batter into a thick round, and use only the listed cooking fat around the edge.',
      'Cook until brown spots appear on both sides and the thick centre is firm with no wet batter.',
      serve(),
    ];
  }
  if (lower.includes('pongal')) {
    return [
      'Rinse the listed grain and dal. Bring them to a boil with 360 ml water, then cover loosely and simmer on low for 20-30 minutes until both mash easily with the back of a spoon. Add 30 ml hot water if the pan dries before the dal softens.',
      'Warm the listed cooking fat in a small pan, sizzle the cumin for 20-30 seconds, add the listed pepper if present, and stir the tempering into the soft grain mixture.',
      'Rest covered 2 minutes; it should be soft and spoonable rather than dry or loose.',
      serve(),
    ];
  }
  if (lower.includes('sabudana khichdi')) {
    return [
      'Use the already-soaked listed sabudana and drain away loose surface water before heating the pan.',
      'Heat 1 tsp oil over medium heat, add 40 g diced potato and 15 ml water, cover, and cook 6-8 minutes until the potato is fork-tender. Uncover to evaporate the water.',
      'Fold in the drained sabudana and 15 g crushed roasted peanuts. Cook for 3-4 minutes, stirring gently, until the pearls turn glossy and translucent.',
      'Switch off the heat, mix in 1 tsp lemon juice, and serve warm before the pearls clump together.',
      serve(),
    ];
  }
  if (lower.includes('thalipeeth') || lower.includes('akki roti')) {
    return [
      'Finely chop the measured vegetables. Mix them with 60 g flour and 35 ml warm water, adding another 5 ml only if dry flour remains. Rest the soft dough 10 minutes.',
      'Divide into two small rounds and pat each thinly between damp sheets; carefully peel it onto a medium-hot non-stick tawa.',
      'Cook for 2-3 minutes per side, sharing the listed 1 tsp oil across the rounds, until both sides have brown spots and the centre has no raw dough.',
      serve(),
    ];
  }
  if (lower.includes('ragi mudde')) {
    return [
      'Whisk the listed ragi flour with 60 ml cold water until smooth, then bring 140 ml water to a full boil.',
      'Pour in the ragi slurry while stirring firmly and cook on low 6-8 minutes until the dough leaves the pan and looks glossy.',
      'Wet your hands, shape the original stated mudde portion, and warm every listed accompaniment separately.',
      serve(),
    ];
  }
  if (lower.includes('bhakri') || lower.includes('rotla')) {
    return [
      'Add 45 ml hot water gradually to 60 g flour, mixing with a spoon. When safe to touch, knead until the dough holds together without cracks; add another 5 ml warm water if it crumbles.',
      'Pat the dough into the original stated portions between damp hands; do not force the fragile millet dough through a rolling pin.',
      'Cook on a medium-hot tawa for 3-4 minutes per side until dry brown spots appear and the centre no longer looks powdery.',
      serve(),
    ];
  }
  if (lower.includes('handvo')) {
    return [
      'Fold every listed vegetable into the prepared batter and rest it 5 minutes so the mixture is even.',
      'Heat the measured 1 tsp oil in a small non-stick pan over medium-low heat. Spread the mixture into a shallow cake, cover, and cook 7-9 minutes until the underside is golden.',
      'Turn carefully with a wide spatula and cook covered for another 4-6 minutes until a skewer comes out clean and the centre feels firm. Rest 3 minutes before slicing.',
      serve(),
    ];
  }
  if (lower.includes('khaman dhokla')) {
    return [
      'Keep the listed prepared khaman pieces intact; this recipe reheats and plates prepared dhokla rather than mixing a new batter.',
      'Steam the pieces 3-4 minutes or warm them covered over low heat until soft and hot through the centre.',
      'Warm the listed oil tempering briefly and spoon it over the prepared pieces without frying them.',
      serve(),
    ];
  }
  if (lower.includes('pesarattu')) {
    return [
      'Finely mince 5 g ginger and 1 green chilli and stir into the listed 80 g prepared green-moong batter. The 40 g dry-moong note describes its equivalent, not extra moong to add.',
      'Heat a non-stick tawa over medium-high heat, spread the batter into thin rounds, and use only the listed cooking fat.',
      'Cook until the edge lifts, the base is crisp, and the top has no wet batter; fold without tearing.',
      serve(),
    ];
  }
  if (lower.includes('boiled eggs with millet upma')) {
    return [
      'Warm the listed prepared boiled eggs in hot water for 2 minutes; do not boil them again.',
      'Reheat the listed prepared millet upma in a covered pan over low heat until steaming, adding 15 ml water only when it looks dry.',
      'Arrange the warm eggs, upma and listed salad just before serving.',
      serve(),
    ];
  }
  if (lower.includes('boiled eggs')) {
    return [
      'Place the listed eggs in cool water, bring it to a boil, then cook 9 minutes for firm yolks.',
      'Cool under running water, peel, halve, and prepare every listed vegetable side immediately before serving.',
      serve(),
    ];
  }
  if (lower.includes('bhurji')) {
    const egg = lower.includes('egg');
    const mushroom = lower.includes('mushroom');
    return [
      egg
        ? 'Finely chop 40 g mixed vegetables. Add them to a non-stick pan with 15 ml water, cover, and cook over medium-low heat for 3-4 minutes until tender; uncover to evaporate the remaining water.'
        : 'Warm 40 g prepared onion-tomato masala in a non-stick pan over medium-low heat for 2 minutes. If it sticks, loosen with 15 ml water; no extra oil is required.',
      egg
        ? 'Lightly beat the three egg whites, add them to the vegetables, and stir gently for 2-3 minutes until fully opaque and set, with no liquid egg remaining.'
        : mushroom
          ? 'Add 100 g chopped mushrooms. Cook for 6-8 minutes, stirring, until tender and their released liquid has evaporated.'
          : `Fold in the measured 80 g crumbled ${lower.includes('tofu') ? 'tofu' : 'paneer'}. Heat gently for 2-3 minutes until hot throughout and coated in masala; do not cook until dry.`,
      'Warm the two prepared phulkas separately on a dry tawa for 20-30 seconds per side. Keep any listed salad fresh and separate from the hot pan.',
      serve(),
    ];
  }
  if (lower.includes('omelette')) {
    return [
      'Beat the listed eggs with their seasonings and fold in every listed chopped vegetable.',
      'Heat a non-stick pan over medium-low heat with the listed cooking fat, pour in the egg mixture, cover, and cook until the base sets.',
      'Fold once and cook until no liquid egg remains; toast the listed bread without extra fat.',
      serve(),
    ];
  }
  if (lower.includes('egg dosa')) {
    return [
      'Heat a non-stick tawa over medium-high heat and spread the listed dosa batter into a thin round.',
      'Crack the listed egg over the surface and spread it evenly with every listed seasoning.',
      'Cook until the egg is fully opaque and the dosa base is crisp, then fold without tearing.',
      serve(),
    ];
  }
  return null;
}

function detailedSteps(recipe) {
  const special = specialSteps(recipe);
  if (special) return special;
  if (recipe.title === 'Rava Idli with Sambar') return ravaIdliSteps();
  if (/\bThepla\b/i.test(recipe.title)) return theplaSteps();
  if (/\bParatha\b/i.test(recipe.title)) return parathaSteps(recipe.title);
  if (/\bPorridge\b/i.test(recipe.title)) return porridgeSteps(recipe);
  if (/\bUpma\b/i.test(recipe.title)) return upmaSteps(recipe);
  if (/\bPoha\b/i.test(recipe.title)) return pohaSteps();
  if (/\bIdli\b/i.test(recipe.title)) return idliSteps();
  if (/\bUttapam\b/i.test(recipe.title)) return uttapamSteps();
  if (/\bDosa\b/i.test(recipe.title)) return recipe.title === 'Set Dosa with Sambar' ? setDosaSteps() : dosaSteps();
  if (/\bChilla\b|\bCheela\b/i.test(recipe.title)) return chillaSteps(recipe);
  if (/\bSandwich\b/i.test(recipe.title)) {
    return [
      'Prepare every listed fresh filling and pat watery vegetables dry so the bread stays crisp.',
      'Toast the listed bread lightly, spread the listed condiment evenly, and layer the measured filling from edge to edge.',
      'Close, press gently, cut immediately before serving, and keep the original stated portion intact.',
    ];
  }
  // Preserve any existing detailed method that does not fall into a breakfast form.
  return String(recipe.instructions).split(/\r?\n/);
}

function personaliseSteps(recipe, steps) {
  const lines = recipe.ingredients.split(/\r?\n/).map((line) => line.trim());
  const sides = lines.filter((line) => /\b(sambar|chutney|thecha|salad|kadhi|stew|kadala|avial|palya)\b/i.test(line)
    || /katori.*\bdal\b/i.test(line));
  const vegetables = lines.filter((line) => !sides.includes(line)
    && /\b(onion|tomato|carrot|mixed vegetables?|palak|methi|beetroot|cabbage|corn|paneer|filling)\b/i.test(line));
  const fat = lines.find((line) => /\b(oil|ghee)\b/i.test(line));
  const batter = lines.find((line) => /\bbatter\b/i.test(line));
  const joined = (items) => items.join('; ');
  return steps.map((step) => {
    if (step === serve()) {
      return `Serve ${recipe.portionSize.replace(/^1 serving\s*·\s*/i, '')}.${sides.length ? ` Plate the measured accompaniments separately: ${joined(sides)}. Warm cooked sides until steaming; keep chutney and salad fresh.` : ''}`;
    }
    let text = step;
    if (vegetables.length) text = text.replace(/every listed chopped vegetable(?:, filling)?/g, `the measured vegetables or filling (${joined(vegetables)})`);
    if (fat) text = text.replace(/the listed cooking fat/g, fat);
    if (batter) text = text.replace(/the listed prepared batter/g, batter);
    return text;
  });
}

export function detailBreakfast(recipe) {
  if (!recipe || recipe.mealType !== 'Breakfast') return recipe;
  const core = coreBreakfastSteps(recipe);
  const instructions = core
    ? numbered(core)
    : numbered(personaliseSteps(recipe, detailedSteps(recipe)));
  const timing = recipe.title === 'Healthy Paratha'
    ? { prepTime: '15 min', cookTime: '45 min', totalTime: '60 min' }
    : recipe.title === 'Ragi Idli'
      ? { prepTime: '25 min', cookTime: '12 min', totalTime: '37 min' }
      : /^(Ven Pongal Light|Millet Pongal)$/.test(recipe.title)
        ? { prepTime: '10 min', cookTime: '30 min', totalTime: '40 min' }
        : {};
  return { ...recipe, ...timing, instructions };
}
