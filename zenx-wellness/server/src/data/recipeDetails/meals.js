const DETAILED_MEAL_TYPES = new Set(['Lunch', 'Dinner', 'Biryani']);

const normalize = (value = '') => String(value).toLowerCase();

function sourceText(recipe) {
  return `${recipe?.title || ''}\n${recipe?.ingredients || ''}`.toLowerCase();
}

function ingredientLines(recipe) {
  return String(recipe?.ingredients || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function findIngredient(recipe, pattern, fallback) {
  return ingredientLines(recipe).find((line) => pattern.test(line)) || fallback;
}

function ingredientBundle(recipe, pattern, fallback) {
  const matches = ingredientLines(recipe).filter(
    (line) => pattern.test(line) && !/\b(?:water|stock|broth|oil|ghee)\b/i.test(line)
  );
  return matches.length ? matches.join('; ') : fallback;
}

const VEGETABLE_LINE = /\b(?:mixed vegetables?|vegetables?|carrot|beans?|cabbage|peas?|celery|tomato|cucumber|lettuce|greens?|capsicum|zucchini|broccoli|cauliflower|mushroom|beetroot|pumpkin|spinach|palak|methi|fenugreek|lauki|bottle gourd|ridge gourd|torai|tinda|apple gourd|chayote|okra|bhindi|eggplant|baingan|bitter gourd|karela|sweet corn|baby corn|corn|jackfruit|sprouts?)\b/i;
const FRESH_SIDE_LINE = /\b(?:salad|lettuce|cucumber|greens?)\b/i;

function vegetableBundle(recipe, fallback = 'the listed vegetables', includeFreshSides = false) {
  const ingredients = ingredientLines(recipe).filter((line) =>
    (includeFreshSides || !/\b(?:salad|lettuce|cucumber)\b/i.test(line)) && !/\b(?:kasuri|powder)\b/i.test(line)
  ).join('\n');
  return ingredientBundle({ ingredients }, VEGETABLE_LINE, fallback);
}

function freshSideBundle(recipe) {
  const matches = ingredientLines(recipe).filter((line) => FRESH_SIDE_LINE.test(line) && !/onion|tomato gravy|masala/i.test(line));
  return matches.length ? matches.join('; ') : null;
}

function masalaBaseBundle(recipe) {
  return ingredientBundle(recipe, /\b(?:onion|tomato|ginger|garlic)\b/i, 'the listed masala ingredients');
}

function has(context, pattern) {
  return pattern.test(context.text);
}

function numberedSteps(steps) {
  return steps
    .map((step) => String(step)
      .replace(/^\d+[.)]\s*/, '')
      .replace(/\bServe(?: only)? (?:the exact|the stated) ([^.;]+?)(?=\s+(?:with|while|immediately)\b|[.;]|$)/g, 'Serve one portion: $1')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean)
    .map((step, index) => `${index + 1}. ${step}`)
    .join('\n');
}

function joinWords(words) {
  const values = [...new Set(words.filter(Boolean))];
  if (values.length === 0) return 'the listed seasonings';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function waterAmount(recipe, fallback) {
  const match = String(recipe?.ingredients || '').match(/(\d+(?:\.\d+)?)\s*ml\s+water(?:\s+for\s+[^\n]+)?/i);
  return match ? `${match[1]} ml water` : fallback;
}

function oilAmount(recipe) {
  const line = findIngredient(recipe, /\b(?:oil|ghee)\b/i, '1 tsp oil');
  const match = line.match(/\b(?:\d+(?:\.\d+)?|1\/2)\s*tsp\s+(?:oil|ghee)\b/i);
  return match ? match[0] : '1 tsp oil';
}

function seasoningPhrase(context) {
  const words = [];
  const hasGingerGarlic = has(context, /ginger[-\s]?garlic/);
  if (hasGingerGarlic) words.push('ginger-garlic');
  if (!hasGingerGarlic && has(context, /\bgarlic\b/)) words.push('garlic');
  if (!hasGingerGarlic && has(context, /\bginger\b/)) words.push('ginger');
  if (has(context, /\bturmeric\b/)) words.push('turmeric');
  if (has(context, /biryani masala/)) words.push('biryani masala');
  if (has(context, /garam masala/)) words.push('garam masala');
  if (has(context, /coriander powder/)) words.push('coriander powder');
  if (has(context, /chilli(?: powder)?/)) words.push('chilli');
  if (has(context, /\bcumin\b/)) words.push('cumin');
  const hasWholeSpices = ingredientLines(context.recipe).some(
    (line) => /\b(?:cardamom|bay leaf|whole spices)\b/i.test(line) || (/\bcloves?\b/i.test(line) && !/garlic clove/i.test(line))
  );
  if (hasWholeSpices) words.push('the listed whole spices');
  return joinWords(words);
}

function marinadeExtras(context) {
  const extras = [];
  if (has(context, /\byogurt\b|\bcurd\b/)) extras.push('the listed yogurt');
  if (has(context, /lemon juice|\blemon\b/)) extras.push('the listed lemon');
  return extras.length ? ` and ${joinWords(extras)}` : '';
}

function servePortion(recipe, details = '') {
  return `Serve one portion: ${recipe?.portionSize || 'the stated portion'}${details}`;
}

function grainContext(recipe) {
  const text = sourceText(recipe);
  const lineFor = (pattern, fallback) => findIngredient(recipe, pattern, fallback);

  if (/\bbasmati\s+or\s+brown rice\b|\bbrown rice\s+or\s+basmati\b/.test(text)) {
    return { kind: 'basmati-or-brown', label: 'basmati or brown rice', line: lineFor(/basmati\s+or\s+brown rice|brown rice\s+or\s+basmati/i, 'the listed basmati or brown rice') };
  }
  if (/\bjeera brown rice\b/.test(text)) {
    return { kind: 'jeera-brown-rice', label: 'jeera brown rice', line: lineFor(/jeera brown rice/i, 'the listed jeera brown rice') };
  }
  if (/\bbrown rice\b/.test(text)) {
    return { kind: 'brown-rice', label: 'brown rice', line: lineFor(/brown rice/i, 'the listed brown rice') };
  }
  if (/\bred rice\b/.test(text)) {
    return { kind: 'red-rice', label: 'red rice', line: lineFor(/red rice/i, 'the listed red rice') };
  }
  if (/\bbasmati\b/.test(text)) {
    return { kind: 'basmati', label: 'basmati rice', line: lineFor(/basmati/i, 'the listed basmati rice') };
  }
  if (/\bfoxtail millet\b/.test(text)) {
    return { kind: 'foxtail-millet', label: 'foxtail millet', line: lineFor(/foxtail millet/i, 'the listed foxtail millet') };
  }
  if (/\bbarnyard millet\b/.test(text)) {
    return { kind: 'barnyard-millet', label: 'barnyard millet', line: lineFor(/barnyard millet/i, 'the listed barnyard millet') };
  }
  if (/\blittle millet\b/.test(text)) {
    return { kind: 'little-millet', label: 'little millet', line: lineFor(/little millet/i, 'the listed little millet') };
  }
  if (/\b(?:bajra|pearl millet)\b/.test(text)) {
    return { kind: 'bajra', label: 'bajra', line: lineFor(/bajra|pearl millet/i, 'the listed bajra') };
  }
  if (/\bjowar\b/.test(text)) {
    return { kind: 'jowar', label: 'jowar', line: lineFor(/jowar/i, 'the listed jowar') };
  }
  if (/\bquinoa\b/.test(text)) {
    return { kind: 'quinoa', label: 'quinoa', line: lineFor(/quinoa/i, 'the listed quinoa') };
  }
  if (/\boats\b/.test(text)) {
    return { kind: 'oats', label: 'oats', line: lineFor(/oats/i, 'the listed oats') };
  }
  if (/\b(?:phulkas?|rotis?|whole-wheat flour)\b/.test(text)) {
    return { kind: 'roti', label: 'whole-wheat rotis', line: lineFor(/whole-wheat flour|phulkas?|rotis?/i, 'the listed whole-wheat flour') };
  }
  if (/\brice\b/.test(text)) {
    return { kind: 'rice', label: 'rice', line: lineFor(/\brice\b/i, 'the listed rice') };
  }
  if (/\bmillet\b/.test(text)) {
    return { kind: 'millet', label: 'millet', line: lineFor(/\bmillet\b/i, 'the listed millet') };
  }
  return { kind: 'none', label: 'the listed grain', line: 'the listed grain' };
}

function pulseContext(recipe) {
  const text = sourceText(recipe);
  const item = (kind, label, pattern) => ({ kind, label, line: findIngredient(recipe, pattern, `the listed ${label}`) });

  if (/\bsprouted moong\b/.test(text)) return item('sprouted-moong', 'sprouted moong', /sprouted moong/i);
  if (/\bmoong dal\b|\byellow moong\b/.test(text)) return item('moong-dal', 'moong dal', /moong dal|yellow moong/i);
  if (/\bmasoor dal\b/.test(text)) return item('masoor-dal', 'masoor dal', /masoor dal/i);
  if (/\btoor dal\b/.test(text)) return item('toor-dal', 'toor dal', /toor dal/i);
  if (/\bchana dal\b/.test(text)) return item('chana-dal', 'chana dal', /chana dal/i);
  if (/\burad dal\b/.test(text)) return item('urad-dal', 'urad dal', /urad dal/i);
  if (/\bmixed? dal\b/.test(text)) return item('mixed-dal', 'mixed dal', /mixed? dal/i);
  if (/\b(?:rajma|kidney beans?)\b/.test(text)) return item('rajma', 'rajma', /rajma|kidney beans?/i);
  if (/\b(?:chole|chickpeas?|kabuli chana|chana masala)\b/.test(text)) return item('chickpeas', 'chickpeas', /chole|chickpeas?|kabuli chana|chana masala/i);
  if (/\b(?:lobia|black-eyed peas?)\b/.test(text)) return item('lobia', 'lobia', /lobia|black-eyed peas?/i);
  if (/\bkala chana\b/.test(text)) return item('kala-chana', 'kala chana', /kala chana/i);
  if (/\bgreen moong\b/.test(text)) return item('green-moong', 'green moong', /green moong/i);
  if (/\bsoy(?:abean|beans)?\b/.test(text)) return item('soybeans', 'soybeans', /soy(?:abean|beans)?/i);
  return null;
}

function proteinContext(recipe) {
  const text = sourceText(recipe);
  const item = (kind, label, pattern) => ({ kind, label, line: findIngredient(recipe, pattern, `the listed ${label}`) });

  if (/\bchicken\b/.test(text)) return item('chicken', 'skinless chicken', /chicken/i);
  if (/\b(?:fish|fillet)\b/.test(text)) return item('fish', 'fish', /fish|fillet/i);
  if (/\bprawn(?:s)?\b/.test(text)) return item('prawns', 'prawns', /prawn/i);
  if (/\beggs?\b/.test(text)) return item('eggs', 'eggs', /eggs?/i);
  if (/\bpaneer\b/.test(text)) return item('paneer', 'paneer', /paneer/i);
  if (/\btofu\b/.test(text)) return item('tofu', 'tofu', /tofu/i);
  if (/\bsoya chunks?\b/.test(text)) return item('soya-chunks', 'soya chunks', /soya chunks?/i);
  return null;
}

function isCookedPulse(pulse) {
  return /\b(?:cooked|boiled)\b/i.test(pulse?.line || '');
}

function pulseReadyStep(context, pulse) {
  if (!pulse) return null;
  if (pulse.kind.endsWith('dal')) {
    if (isCookedPulse(pulse)) return `Use ${pulse.line} as the already-cooked dal; stir it into the cooked masala and simmer for 3–5 minutes until hot throughout.`;
    const water = waterAmount(context.recipe, '250 ml water');
    return `Rinse ${pulse.line} until the water runs clear, soak 15 minutes, then pressure-cook it with turmeric and ${water} until soft enough to crush with a spoon; let the pressure fall naturally.`;
  }
  if (pulse.kind === 'sprouted-moong') {
    return `Rinse ${pulse.line}, then steam or simmer it in 120 ml water for 10–15 minutes or longer until thoroughly cooked and tender throughout; do not layer raw sprouts into a rice dish.`;
  }
  if (pulse.kind === 'soybeans') {
    if (isCookedPulse(pulse)) return `Drain ${pulse.line} and simmer it in the masala for 5 minutes so the beans absorb flavour without breaking.`;
    return `Use ${pulse.line} fully cooked. If starting with dry soybeans, soak them overnight and pressure-cook until creamy before beginning the timed recipe.`;
  }
  if (isCookedPulse(pulse)) {
    return `Drain ${pulse.line}, then add it only after the masala is cooked and simmer 5 minutes so the pulse stays whole.`;
  }
  return `Use ${pulse.line} fully cooked. If starting with dry ${pulse.label}, soak it 8–12 hours and pressure-cook it until creamy before beginning the timed recipe; do not cook dry beans only during the final simmer.`;
}

function rotiStep(context) {
  const flour = findIngredient(context.recipe, /whole-wheat flour|atta/i, null);
  if (!flour) return `Use ${context.grain.line} as the prepared bread portion. Warm on a dry tawa for 20–30 seconds per side until pliable; no new dough is required.`;
  const water = findIngredient(context.recipe, /\bwater\s+for\s+dough\b/i, null) ||
    findIngredient(context.recipe, /^\d+(?:\.\d+)?\s*ml\s+water$/i, '40 ml water for dough');
  return `Mix ${flour} with ${water}, knead 3–4 minutes, and rest the dough 10 minutes. Divide it into the listed rotis, roll them thin, and cook on a hot dry tawa for about 1 minute per side until brown spots appear.`;
}

function grainSideSteps(context) {
  const grain = context.grain;
  if (grain.kind === 'roti') return [rotiStep(context)];
  if (grain.kind === 'none') return [];
  if (/\bcooked\b/i.test(grain.line)) {
    return [`Use ${grain.line} as the ready cooked portion; warm it with 1–2 tbsp water for 2 minutes only and do not cook the grain a second time.`];
  }

  const methods = {
    'brown-rice': `Rinse ${grain.line}; simmer it covered in 150 ml water on the lowest heat for 25–30 minutes, until the centre is tender, then rest 5 minutes and fluff.`,
    'jeera-brown-rice': `Rinse ${grain.line}; simmer it covered in 150 ml water on the lowest heat for 25–30 minutes, until the centre is tender, then rest 5 minutes and fluff.`,
    'red-rice': `Rinse ${grain.line}; simmer it covered in 160 ml water on the lowest heat for 28–32 minutes, until the grain is tender but separate, then rest 5 minutes and fluff.`,
    basmati: `Rinse ${grain.line}, soak it 15 minutes, then simmer it covered in 120 ml water for 10–12 minutes. Rest 5 minutes and fluff without mashing the grains.`,
    'basmati-or-brown': `Choose the grain stated in ${grain.line}: simmer basmati covered in 120 ml water for 10–12 minutes, or soak brown rice 30 minutes and simmer it in 150 ml water for 25–30 minutes. Rest 5 minutes and fluff.`,
    rice: `Rinse ${grain.line}; simmer it covered in 120 ml water for 12–15 minutes, then rest 5 minutes and fluff.`,
    'foxtail-millet': `Rinse ${grain.line}; simmer it covered in 120 ml water for 10–12 minutes, rest 5 minutes, and fluff with a fork.`,
    'barnyard-millet': `Rinse ${grain.line}; simmer it covered in 120 ml water for 10–12 minutes, rest 5 minutes, and fluff with a fork.`,
    'little-millet': `Rinse ${grain.line}; simmer it covered in 120 ml water for 10–12 minutes, rest 5 minutes, and fluff with a fork.`,
    millet: `Rinse ${grain.line}; simmer it covered in 130 ml water for 12–15 minutes, rest 5 minutes, and fluff with a fork.`,
    bajra: `Rinse ${grain.line}; pressure-cook it with 220 ml water for 3 whistles, then rest until the pressure releases and fluff it gently.`,
    jowar: `Rinse ${grain.line}; pressure-cook it with 220 ml water for 3 whistles, then rest until the pressure releases and fluff it gently.`,
    quinoa: `Rinse ${grain.line} in a fine sieve; simmer it covered in 120 ml water for 12–14 minutes until the germ curls out, then rest 5 minutes and fluff.`,
    oats: `Toast ${grain.line} dry for 1 minute, then cook it in 220 ml water over low heat for 5–7 minutes, stirring until the flakes are soft but not pasty.`,
  };

  return [methods[grain.kind] || `Cook ${grain.line} with 150 ml water until tender, then rest it covered for 5 minutes.`];
}

function biryaniGrainPlan(grain) {
  const plans = {
    basmati: {
      prep: `Rinse ${grain.line}, soak it 20 minutes, then boil it in 500 ml water for 5–6 minutes until about 70% cooked: the grain should bend but retain a firm centre. Drain immediately.`,
      finish: 'Cover tightly and dum-cook on the lowest heat for 12 minutes, then rest 5 minutes before fluffing from the edge of the pot.',
    },
    'basmati-or-brown': {
      prep: `Choose the grain stated in ${grain.line}. For basmati, rinse, soak 20 minutes, then boil it in 500 ml water for 5–6 minutes until 70% cooked and drain. For brown rice, rinse, soak 30 minutes, then simmer it in 500 ml water for 18–22 minutes until the centre remains firm and drain.`,
      finish: 'For basmati, dum-cook on the lowest heat for 12 minutes; for brown rice, dum-cook 15–18 minutes. Rest the covered pot 5–8 minutes, then fluff from the edge.',
    },
    rice: {
      prep: `Rinse ${grain.line}, soak it 15 minutes, then boil it in 500 ml water for 6–7 minutes until about 70% cooked. Drain before layering.`,
      finish: 'Cover tightly and dum-cook on the lowest heat for 12 minutes, then rest 5 minutes before fluffing from the edge of the pot.',
    },
    'brown-rice': {
      prep: `Rinse ${grain.line}, soak it 30 minutes, then simmer it in 500 ml water for 18–22 minutes until the outside is tender but the centre is still firm. Drain before layering.`,
      finish: 'Cover tightly and dum-cook on the lowest heat for 15–18 minutes, then rest 8 minutes before fluffing from the edge of the pot.',
    },
    'jeera-brown-rice': {
      prep: `Rinse ${grain.line}, soak it 30 minutes, then simmer it in 500 ml water for 18–22 minutes until the outside is tender but the centre is still firm. Drain before layering.`,
      finish: 'Cover tightly and dum-cook on the lowest heat for 15–18 minutes, then rest 8 minutes before fluffing from the edge of the pot.',
    },
    'red-rice': {
      prep: `Rinse ${grain.line}, soak it 30 minutes, then simmer it in 550 ml water for 20–24 minutes until the outside is tender but the centre is still firm. Drain before layering.`,
      finish: 'Cover tightly and dum-cook on the lowest heat for 15–18 minutes, then rest 8 minutes before fluffing from the edge of the pot.',
    },
    'foxtail-millet': {
      prep: `Rinse ${grain.line}; simmer it in 150 ml water for 8–10 minutes until the grains are only three-quarters tender, then spread it on a plate so it stops steaming.`,
      finish: 'Cover tightly and finish on the lowest heat for 8 minutes, then rest 5 minutes before fluffing gently.',
    },
    'barnyard-millet': {
      prep: `Rinse ${grain.line}; simmer it in 150 ml water for 8–10 minutes until the grains are only three-quarters tender, then spread it on a plate so it stops steaming.`,
      finish: 'Cover tightly and finish on the lowest heat for 8 minutes, then rest 5 minutes before fluffing gently.',
    },
    'little-millet': {
      prep: `Rinse ${grain.line}; simmer it in 150 ml water for 8–10 minutes until the grains are only three-quarters tender, then spread it on a plate so it stops steaming.`,
      finish: 'Cover tightly and finish on the lowest heat for 8 minutes, then rest 5 minutes before fluffing gently.',
    },
    millet: {
      prep: `Rinse ${grain.line}; simmer it in 150 ml water for 8–10 minutes until the grains are only three-quarters tender, then spread it on a plate so it stops steaming.`,
      finish: 'Cover tightly and finish on the lowest heat for 8 minutes, then rest 5 minutes before fluffing gently.',
    },
    quinoa: {
      prep: `Rinse ${grain.line} in a fine sieve; simmer it covered in 120 ml water for 10–12 minutes until the germ curls out and the centre is barely firm. Rest it uncovered for 3 minutes.`,
      finish: 'Fold the quinoa through the hot filling, cover on the lowest heat for 3 minutes, and rest 5 minutes; quinoa becomes pasty with a long dum.',
    },
  };

  return plans[grain.kind] || plans.rice;
}

function biryaniProteinSteps(context) {
  const protein = context.protein;
  const pulse = context.pulse;
  const seasonings = seasoningPhrase(context);

  if (protein?.kind === 'chicken') {
    return [
      `Coat ${protein.line} with ${seasonings} and any listed yogurt or lemon; refrigerate 15 minutes.`,
      `Cook the chicken in the vegetable masala with 60 ml water for 8–10 minutes before layering; check the thickest piece reaches 74°C / 165°F and has no pink centre.`,
    ];
  }
  if (protein?.kind === 'fish') {
    return [
      `Coat ${protein.line} with ${seasonings} and any listed yogurt or lemon for 10 minutes.`,
      `Set the fish on top of the cooked vegetable masala and cook it gently for 4–6 minutes, turning once only if needed, until the thickest piece reaches 63°C / 145°F and flakes in large pieces.`,
    ];
  }
  if (protein?.kind === 'prawns') {
    return [
      `Coat ${protein.line} with ${seasonings} for 10 minutes.`,
      `Stir the prawns through the vegetable masala for 3–4 minutes only, until opaque and curled; overcooking makes them rubbery.`,
    ];
  }
  if (protein?.kind === 'eggs') {
    return [
      `Hard-boil ${protein.line} for 9–10 minutes, cool, peel, and make two shallow slits in each egg so the masala coats it.`,
      `Roll the eggs gently in the cooked vegetable masala for 2 minutes; do not fry them separately.`,
    ];
  }
  if (protein?.kind === 'paneer') {
    return [
      `Toss ${protein.line} with ${seasonings} and any listed yogurt for 10 minutes.`,
      `Sear the paneer in the hot vegetable masala for 1 minute per side; keep the cubes intact and do not deep-fry them.`,
    ];
  }
  if (protein?.kind === 'tofu') {
    return [
      `Pat ${protein.line} dry, coat it with ${seasonings}, and rest it 10 minutes.`,
      `Sear the tofu in the vegetable masala for 2 minutes per side so the surface browns without breaking.`,
    ];
  }
  if (protein?.kind === 'soya-chunks') {
    return [
      `Soak ${protein.line} in hot water for 10 minutes if it is dry, drain, squeeze firmly, and toss it with ${seasonings}.`,
      `Cook the soya chunks in the vegetable masala for 4–5 minutes before layering so they absorb flavour without becoming chewy.`,
    ];
  }
  if (pulse) return [pulseReadyStep(context, pulse)];
  return [`Cut the listed vegetables into 1–2 cm pieces and toss them with ${seasonings} so every layer carries the recipe's flavour.`];
}

function biryaniSteps(context) {
  const plan = biryaniGrainPlan(context.grain);
  const vegetables = vegetableBundle(context.recipe);
  const herbs = has(context, /mint|coriander/) ? 'the listed mint and coriander' : 'the listed herbs';
  const delicateLayer = ['fish', 'eggs'].includes(context.protein?.kind)
    ? '; keep the fish or eggs near the top so they do not break'
    : '';

  return [
    `Set out the measured ingredients and keep the grain, filling, herbs, and cucumber salad separate so the layers stay distinct.`,
    plan.prep,
    ...biryaniProteinSteps(context),
    `Heat ${oilAmount(context.recipe)} over medium heat, toast any listed whole spices for 20 seconds, then cook ${vegetables} for 4–6 minutes until crisp-tender.`,
    `Layer half the grain, the cooked filling, and ${herbs}; repeat once${delicateLayer}.`,
    plan.finish,
    `Serve only the stated ${context.recipe.portionSize || 'bowl'} with the listed cucumber salad; do not add ghee, fried onion, or extra grain at the table.`,
  ];
}

function khichdiSteps(context) {
  const pulse = context.pulse;
  const grain = context.grain;
  const vegetables = vegetableBundle(context.recipe);
  const water = waterAmount(
    context.recipe,
    grain.kind === 'oats' ? '260 ml water' : grain.kind === 'quinoa' ? '300 ml water' : /bajra|jowar/.test(grain.kind) ? '400 ml water' : '350 ml water'
  );

  const grainMethod = grain.kind === 'oats'
    ? `Add ${grain.line}, ${vegetables}, and ${water}; simmer uncovered on low for 6–8 minutes, stirring until the oats are soft and the pot is spoonable, not gluey.`
    : grain.kind === 'quinoa'
      ? `Add ${grain.line}, ${vegetables}, and ${water}; cover and simmer on low for 14–16 minutes until the quinoa germ curls out and the dal is soft.`
      : /bajra|jowar/.test(grain.kind)
        ? `Add ${grain.line}, ${vegetables}, and ${water}; pressure-cook for 3 whistles, then let the pressure fall naturally so the coarse grain becomes tender.`
        : `Add ${grain.line}, ${vegetables}, and ${water}; pressure-cook for 2 whistles, then let the pressure fall naturally until the grain and pulse are soft but still identifiable.`;

  return [
    `Rinse ${grain.line} and ${pulse?.line || 'the listed pulse'} separately until the water runs clear; soak the pulse 15 minutes when it is a dry dal.`,
    `Heat ${oilAmount(context.recipe)} over medium heat, crackle the listed cumin, then cook ginger and the measured vegetables for 2 minutes without browning them.`,
    grainMethod,
    `Open the cooker, stir once, and mash only a small portion against the pot wall for a creamy texture while leaving vegetables visible.`,
    `Taste for the listed salt, rest 3 minutes, and serve the exact ${context.recipe.portionSize || 'bowl'} while hot; the water should be absorbed into a loose khichdi rather than a dry pulao.`,
  ];
}

function dalVegetableFinish(context) {
  const text = context.text;
  if (/palak|spinach/.test(text)) return 'Fold the listed spinach into the hot dal for the final 2 minutes, just until wilted and bright green.';
  if (/lauki|bottle gourd/.test(text)) return 'Add the listed bottle gourd with 60 ml water and cook it tender before folding in the dal.';
  if (/methi|fenugreek/.test(text)) return 'Add the listed fenugreek leaves in the final 2 minutes so they wilt without becoming dull.';
  if (/tomato/.test(text)) return 'Cook the listed tomato until it breaks down, then simmer the dal for 3 minutes to marry the tangy base.';
  if (/garlic/.test(text)) return 'Brown the listed garlic lightly in the measured oil, then pour it over the dal immediately for a fragrant tadka.';
  return 'Simmer the seasoned dal for 3 minutes, stirring once, until it coats a spoon but still pours easily.';
}

function dalPlateSteps(context) {
  const pulse = context.pulse || { line: 'the listed dal', label: 'dal', kind: 'dal' };
  const water = waterAmount(context.recipe, '250 ml water');

  return [
    `Rinse ${pulse.line} until the water runs clear, soak 15 minutes, then pressure-cook it with turmeric and ${water} until soft enough to mash with a spoon.`,
    ...grainSideSteps(context),
    `Heat ${oilAmount(context.recipe)} over medium heat; toast the listed cumin and aromatics for 20–30 seconds, then add the measured tomato or vegetables and cook until the raw smell is gone.`,
    dalVegetableFinish(context),
    `Serve the stated ${context.recipe.portionSize || 'plate'} with the grain or rotis kept to the measured portion; the dal is the protein side, not a thin soup.`,
  ];
}

function vegetableContext(context) {
  const text = context.text;
  const choices = [
    [/bhindi|okra/, 'okra'],
    [/baingan|eggplant/, 'eggplant'],
    [/bitter gourd|karela/, 'bitter gourd'],
    [/bottle gourd|lauki/, 'bottle gourd'],
    [/ridge gourd|torai/, 'ridge gourd'],
    [/tinda|apple gourd/, 'apple gourd'],
    [/chayote/, 'chayote'],
    [/pumpkin/, 'pumpkin'],
    [/mushroom/, 'mushrooms'],
    [/spinach|palak/, 'spinach'],
    [/methi|fenugreek/, 'fenugreek leaves'],
    [/cabbage/, 'cabbage'],
    [/cauliflower|gobi/, 'cauliflower'],
    [/broccoli/, 'broccoli'],
    [/beans/, 'green beans'],
    [/carrot.*peas|peas.*carrot/, 'carrot and peas'],
    [/baby corn/, 'baby corn'],
    [/corn/, 'sweet corn'],
    [/beetroot/, 'beetroot'],
    [/zucchini/, 'zucchini'],
    [/capsicum/, 'capsicum'],
    [/sprouts/, 'sprouts'],
  ];
  const [, name] = choices.find(([pattern]) => pattern.test(text)) || [];
  return name || 'the listed vegetables';
}

function sabziCookSteps(context) {
  const vegetable = vegetableContext(context);
  const oil = oilAmount(context.recipe);
  const spice = seasoningPhrase(context);
  const text = context.text;

  if (/bhindi|okra/.test(text)) {
    return [
      `Wash ${vegetable}, dry it completely, trim it, and cut it into 1 cm pieces; moisture is what makes okra slimy.`,
      `Heat ${oil} over medium-high heat and cook the okra uncovered for 5–7 minutes until the cut sides look dry.`,
      `Lower the heat, add the listed tomato and ${spice}, and cook 3–4 minutes until the masala clings to the okra without making it wet.`,
    ];
  }
  if (/baingan|eggplant/.test(text) && /bharta/.test(text)) {
    const masalaBase = masalaBaseBundle(context.recipe);
    return [
      `Pierce the ${vegetable} and roast it over a flame or at 220°C for 20–25 minutes, turning until the flesh collapses; cool, peel, and mash it.`,
      `Heat ${oil} over medium heat and cook ${masalaBase} with ${spice} until thick, then fold in the mashed eggplant for 4 minutes.`,
    ];
  }
  if (/bitter gourd|karela/.test(text)) {
    return [
      `Slice the ${vegetable}, toss it with the listed salt, and rest it 10 minutes; squeeze it dry before cooking to temper the bitterness.`,
      `Heat ${oil} over medium heat and sauté the bitter gourd 6–8 minutes until browned at the edges, then add the listed tomato and ${spice} for 3 minutes.`,
    ];
  }
  if (/mushroom/.test(text)) {
    return [
      `Wipe and slice the ${vegetable}; keep the pieces dry so they brown instead of steaming.`,
      `Heat ${oil} over medium-high heat, cook the mushrooms until their liquid evaporates, then add the listed tomato and ${spice} for 3–4 minutes.`,
    ];
  }
  if (/spinach|palak|methi|fenugreek/.test(text)) {
    return [
      `Wash ${vegetable} well and cut it finely; blanch spinach for 2 minutes only when the recipe calls for a smooth gravy.`,
      `Heat ${oil} over medium heat, cook the listed aromatics and ${spice} for 1 minute, then add the leaves and cook just until wilted and bright.`,
    ];
  }
  if (/lauki|bottle gourd|ridge gourd|torai|tinda|apple gourd|chayote|pumpkin/.test(text)) {
    return [
      `Peel and cut ${vegetable} into even 1.5 cm pieces so it cooks evenly.`,
      `Heat ${oil} over medium heat, cook the listed aromatics and ${spice} for 1 minute, add the vegetable with 60 ml water, cover, and simmer 8–12 minutes until tender; these vegetables release their own liquid, so do not flood the pan.`,
    ];
  }
  if (/sprouts/.test(text)) {
    return [
      `Rinse the ${vegetable}; steam it 5 minutes if it is raw so the centre is tender before it enters the masala.`,
      `Heat ${oil} over medium heat, cook the listed aromatics and ${spice} for 1 minute, then add the sprouts with 60 ml water and simmer 4 minutes.`,
    ];
  }
  return [
    `Wash and cut ${vegetable} into equal bite-size pieces so it cooks at one rate.`,
    `Heat ${oil} over medium heat, cook the listed aromatics and ${spice} for 1 minute, then add the vegetable with 60 ml water; cover and cook 7–10 minutes until just tender rather than mushy.`,
  ];
}

function sabziSteps(context) {
  const vegetable = vegetableContext(context);
  return [
    ...grainSideSteps(context),
    ...sabziCookSteps(context),
    `Uncover and cook 1–2 minutes until the gravy coats ${vegetable}; finish with any listed herbs and keep the texture distinct.`,
    `Serve the exact ${context.recipe.portionSize || 'plate'} with its measured grain or rotis. Do not add cream, butter, fried papad, or extra oil.`,
  ];
}

function southIndianPlateSteps(context) {
  const text = context.text;
  const water = waterAmount(context.recipe, '350 ml water');

  if (/rasam/.test(text)) {
    return [
      ...grainSideSteps(context),
      `Simmer the listed tomato, tamarind, garlic, pepper, cumin, and ${water} for 10–12 minutes until the tomato softens; do not boil rasam hard after the spices are fragrant.`,
      `Heat ${oilAmount(context.recipe)} over medium heat, splutter the listed mustard for 20 seconds, and pour the tempering into the rasam with coriander.`,
      `Serve the stated ${context.recipe.portionSize || 'plate'} with the measured grain; rasam should remain a light, pourable broth.`,
    ];
  }
  if (/sambar/.test(text)) {
    return [
      `Rinse the listed toor dal, pressure-cook it with ${water} until completely soft, and mash it lightly.`,
      ...grainSideSteps(context),
      `Simmer the listed vegetables, tamarind, and sambar powder until the vegetables are tender, then stir in the dal for 3 minutes.`,
      `Temper the listed mustard in ${oilAmount(context.recipe)}, finish with coriander, and serve the exact ${context.recipe.portionSize || 'plate'} with the grain.`,
    ];
  }
  if (/avial/.test(text)) {
    return [
      ...grainSideSteps(context),
      `Cook the listed mixed vegetables with 80 ml water, covered, until just tender and still shaped.`,
      `Fold in the recipe's listed coconut or yogurt mixture on low heat for 1 minute; do not boil yogurt once it is added.`,
      `Serve the stated ${context.recipe.portionSize || 'plate'} with the measured grain.`,
    ];
  }
  return [
    ...grainSideSteps(context),
    `Cook the listed vegetables and pulse with ${water} until tender, keeping the curry thick enough to scoop rather than watery.`,
    `Temper the listed spices in ${oilAmount(context.recipe)} over medium heat and stir through for the final minute.`,
    `Serve the stated ${context.recipe.portionSize || 'plate'} with the measured grain.`,
  ];
}

function chickenCookStep(protein, style) {
  if (style === 'grill') {
    return `Cook ${protein.line} on a lightly oiled grill pan over medium heat for 5–6 minutes per side, or bake at 200°C for 16–18 minutes; rest 3 minutes after the thickest part reaches 74°C / 165°F with no pink centre.`;
  }
  return `Add ${protein.line} and 60 ml water to the cooked masala, cover, and simmer 10–12 minutes; check the thickest piece reaches 74°C / 165°F with no pink centre before serving.`;
}

function fishCookStep(protein, style) {
  if (style === 'grill') {
    return `Cook ${protein.line} on a lightly oiled grill pan over medium heat for 3–4 minutes per side; stop when the thickest part reaches 63°C / 145°F and the flesh is opaque and flakes.`;
  }
  return `Slide ${protein.line} into the simmering gravy and cook gently for 4–6 minutes, turning once only if needed, until the thickest part reaches 63°C / 145°F and flakes in large pieces.`;
}

function proteinMealSteps(context) {
  const protein = context.protein;
  const text = context.text;
  const style = /grilled|tikka|tandoori|baked/.test(text) ? 'grill' : 'curry';
  const spice = seasoningPhrase(context);
  const vegetables = vegetableBundle(context.recipe);
  const freshSide = freshSideBundle(context.recipe);
  const curryBase = masalaBaseBundle(context.recipe);
  const serveFreshSide = freshSide
    ? `Prepare ${freshSide} as the fresh side, then serve the exact ${context.recipe.portionSize || 'plate'} without extra oil or fried sides.`
    : `Serve the exact ${context.recipe.portionSize || 'plate'} with its measured grain or rotis; keep the cooked masala with the protein rather than treating it as a fresh side.`;

  if (!protein) return genericMealSteps(context);
  if (['chicken', 'fish'].includes(protein.kind) && /\b(?:cooked|grilled|baked)\b/i.test(protein.line)) {
    const cookedVegetables = vegetableBundle(context.recipe, null);
    return [
      ...grainSideSteps(context),
      `Start with ${protein.line} already fully cooked. Reheat gently in a covered pan with 1 tbsp water until the center reaches 74°C / 165°F; do not treat this prepared ingredient as raw meat.`,
      cookedVegetables && `Warm ${cookedVegetables} separately if already steamed or cooked; otherwise steam them until tender, about 5–8 minutes depending on their size.`,
      freshSide && `Prepare ${freshSide} and keep it separate from the hot pan.`,
      'Add the measured lemon, herbs or seasoning only where listed, after reheating.',
      `Serve the original portion (${context.recipe.portionSize}) with all its measured accompaniments.`,
    ].filter(Boolean);
  }
  if (protein.kind === 'chicken') {
    return [
      ...grainSideSteps(context),
      `Coat ${protein.line} with ${spice}${marinadeExtras(context)}; refrigerate 15 minutes so the seasoning reaches the surface.`,
      style === 'grill'
        ? chickenCookStep(protein, 'grill')
        : `Heat ${oilAmount(context.recipe)} over medium heat, cook ${curryBase} with ${spice} until the tomato is thick, then ${chickenCookStep(protein, 'curry')}`,
      style === 'grill' ? serveFreshSide : `Rest the curry 3 minutes so the chicken and masala settle, then ${serveFreshSide}`,
    ];
  }
  if (protein.kind === 'fish') {
    return [
      ...grainSideSteps(context),
      `Pat ${protein.line} dry and coat it with ${spice}${marinadeExtras(context)}; rest it 10 minutes.`,
      style === 'grill'
        ? fishCookStep(protein, 'grill')
        : `Heat ${oilAmount(context.recipe)} over medium heat, cook ${curryBase} with ${spice} until soft, then ${fishCookStep(protein, 'curry')}`,
      style === 'grill'
        ? (freshSide ? `Serve the exact ${context.recipe.portionSize || 'plate'} with ${freshSide}; do not batter or fry the fish.` : `Serve the exact ${context.recipe.portionSize || 'plate'} with its measured grain or rotis; do not batter or fry the fish.`)
        : `Rest the fish curry 2 minutes, then serve the exact ${context.recipe.portionSize || 'plate'} with the measured grain or rotis.`,
    ];
  }
  if (protein.kind === 'prawns') {
    return [
      ...grainSideSteps(context),
      `Pat ${protein.line} dry and coat it with ${spice}${marinadeExtras(context)} for 10 minutes.`,
      `Heat ${oilAmount(context.recipe)} over medium heat, cook ${curryBase} with ${spice} until thick, then sauté the prawns 3–4 minutes until opaque and curled.`,
      `Serve the exact ${context.recipe.portionSize || 'plate'} with the measured grain or rotis while the prawns are tender.`,
    ];
  }
  if (protein.kind === 'eggs') {
    return [
      ...grainSideSteps(context),
      `Hard-boil ${protein.line} for 9–10 minutes, cool under running water, peel, and halve them.`,
      `Heat ${oilAmount(context.recipe)} over medium heat, cook the listed onion, tomato, and ${spice} until thick, then simmer the eggs in the gravy for 3 minutes.`,
      `Serve the exact ${context.recipe.portionSize || 'plate'} with the measured side; do not substitute fried puri.`,
    ];
  }
  if (protein.kind === 'soya-chunks') {
    return [
      ...grainSideSteps(context),
      /\b(?:soaked and cooked|cooked)\b/i.test(protein.line)
        ? `Use ${protein.line} as the ready hydrated protein; squeeze out excess water before it enters the masala.`
        : `Soak ${protein.line} in hot water for 10 minutes, drain, squeeze firmly, and cut any large chunks in half.`,
      `Heat ${oilAmount(context.recipe)} over medium heat, cook ${curryBase} with ${spice} until thick, then simmer the soya chunks for 5–8 minutes so they absorb the masala.`,
      freshSide
        ? `Serve the exact ${context.recipe.portionSize || 'plate'} with ${freshSide}; the chunks should be tender, not watery.`
        : `Serve the exact ${context.recipe.portionSize || 'plate'} with the measured grain or rotis while the chunks are tender.`,
    ];
  }
  if (protein.kind === 'paneer' || protein.kind === 'tofu') {
    if (/palak|spinach/.test(text)) {
      const spinach = ingredientBundle(context.recipe, /spinach|palak/i, 'the listed spinach');
      const tomato = ingredientBundle(context.recipe, /tomato/i, 'the listed tomato');
      const spinachPrep = /\bblanch(?:ed)?\b/i.test(spinach)
        ? `Use ${spinach} as the blanched spinach; cool it quickly and blend it to a smooth purée so it stays green.`
        : `Blanch ${spinach} for 2 minutes, cool it quickly, and blend it to a smooth purée so it stays green.`;
      return [
        ...grainSideSteps(context),
        spinachPrep,
        `Heat ${oilAmount(context.recipe)} over medium heat, cook ${tomato} and ${spice} until soft, then stir in the spinach purée and simmer 3 minutes.`,
        `Fold in ${protein.line} and cook 2 minutes only, keeping the ${protein.label} cubes intact; do not add cream.`,
        `Serve the exact ${context.recipe.portionSize || 'plate'} with the measured grain or rotis while the spinach gravy is bright and thick.`,
      ];
    }
    if (style === 'grill') return [
      ...grainSideSteps(context),
      `Pat ${protein.line} dry and cut into even cubes. Coat with ${spice}${marinadeExtras(context)} and rest for 10 minutes.`,
      `Heat a non-stick pan over medium heat, using only the oil measured in the ingredient list. Cook the cubes for 1–2 minutes on each side until lightly golden and hot through.`,
      `Cook ${vegetables} alongside until tender; keep any fresh salad out of the hot pan. Serve the original portion with all its measured sides.`,
    ];
    return [
      ...grainSideSteps(context),
      `Pat ${protein.line} dry and cut it into even cubes; tofu benefits from a firm press before cooking.`,
      `Heat ${oilAmount(context.recipe)} over medium heat. Cook ${curryBase} with ${spice} for 4–5 minutes, until the onion is soft and the tomato breaks down.`,
      'If additional cooking vegetables are listed, add them to the masala and cook for 5–8 minutes until tender. Keep any fresh salad separate.',
      `Add ${waterAmount(context.recipe, '60 ml water')} to loosen the masala, then fold in the ${protein.label}. Simmer gently for 2–3 minutes without breaking the cubes; add any listed kasuri methi at the end.`,
      `Serve the original portion (${context.recipe.portionSize || 'plate'}) with all the measured sides; keep any fresh salad out of the hot pan.`,
    ];
  }
  return genericMealSteps(context);
}

function soupSteps(context) {
  const protein = context.protein;
  const pulse = context.pulse;
  const title = normalize(context.recipe.title);
  const water = waterAmount(context.recipe, protein?.kind === 'chicken' ? '400 ml water' : '500 ml water');
  const vegetables = vegetableBundle(context.recipe);
  const clear = /clear|broth|lemon|hot and sour|rasam/.test(title);

  if (protein?.kind === 'chicken') {
    return [
      `Trim visible fat from ${protein.line} and cut it into 1 cm pieces; chop ${vegetables} into similarly small pieces.`,
      `Heat ${oilAmount(context.recipe)} over medium-low heat and cook the listed onion, garlic, and ginger for 1 minute without browning.`,
      `Add the chicken, ${vegetables}, and ${water}; bring to a boil, then simmer gently for 15–18 minutes until the thickest chicken piece reaches 74°C / 165°F.`,
      `Skim any foam, season with the listed pepper and salt, and keep the vegetables tender rather than mushy; do not add cream or soup powder.`,
      `Serve the exact ${context.recipe.portionSize || 'bowl'} with the listed toast while hot.`,
    ];
  }
  if (pulse?.kind?.endsWith('dal')) {
    return [
      `Rinse ${pulse.line} until the water runs clear; cook it with ${water} until fully soft, about 18–20 minutes at a gentle simmer.`,
      `Heat ${oilAmount(context.recipe)} over medium-low heat and cook the listed onion, garlic, ginger, and ${vegetables} for 2 minutes without browning.`,
      `Stir in the cooked dal and simmer 5 minutes so the vegetables are tender and the soup coats a spoon.`,
      `Remove the pan from the heat and blend only half the pot with an immersion blender, or cool it until warm and follow the jug blender manufacturer's hot-liquid instructions; a clear soup should keep the pieces visible.`,
      `Serve the exact ${context.recipe.portionSize || 'bowl'} with the listed toast; do not use cream or cornflour.`,
    ];
  }
  return [
    `Wash and cut ${vegetables} into equal small pieces so they soften at the same rate.`,
    `Heat ${oilAmount(context.recipe)} over medium-low heat and cook the listed onion, garlic, and ginger for 1 minute without browning.`,
    `Add ${vegetables}, the listed seasonings, and ${water}; bring to a boil, then simmer ${clear ? '10–12' : '12–15'} minutes until the vegetables are tender.`,
    clear
      ? 'Keep the broth clear and the vegetables distinct; adjust thickness only with hot water, not cream or cornflour.'
      : 'Remove the pan from the heat and blend two-thirds with an immersion blender, or cool it until warm and follow the jug blender manufacturer’s hot-liquid instructions; return it to the pan for a 1-minute simmer and leave the remaining pieces for texture.',
    `Serve the exact ${context.recipe.portionSize || 'bowl'} with the listed toast while hot.`,
  ];
}

function saladSteps(context) {
  const protein = context.protein;
  const pulse = context.pulse;
  const vegetables = vegetableBundle(context.recipe, 'the listed salad vegetables', true);
  const dressing = has(context, /olive oil|lemon/) ? 'the listed lemon and oil dressing' : 'the listed dressing';
  const steps = [
    `Wash ${vegetables} well, dry it thoroughly, and cut it into bite-size pieces so the salad does not become watery.`,
  ];

  if (protein?.kind === 'chicken') {
    steps.push(`Cook ${protein.line} over medium heat until the thickest piece reaches 74°C / 165°F, rest it 3 minutes, then slice it across the grain.`);
  } else if (protein?.kind === 'fish') {
    steps.push(`Cook ${protein.line} over medium heat until the thickest part reaches 63°C / 145°F and flakes, then cool it for 2 minutes before breaking it into large pieces.`);
  } else if (protein?.kind === 'paneer' || protein?.kind === 'tofu') {
    steps.push(`Sear ${protein.line} in a dry non-stick pan for 1–2 minutes per side until lightly coloured, then keep the cubes whole.`);
  } else if (protein?.kind === 'eggs') {
    steps.push(`Hard-boil ${protein.line} for 9–10 minutes, cool, peel, and quarter the eggs.`);
  } else if (pulse) {
    steps.push(pulseReadyStep(context, pulse));
  }

  steps.push(`Whisk ${dressing} with the listed seasoning in the serving bowl, then toss the vegetables and protein or pulse only just before eating.`);
  steps.push(`Serve the exact ${context.recipe.portionSize || 'bowl'} immediately so the greens stay crisp; do not add fried toppings.`);
  return steps;
}

function wrapSteps(context) {
  const protein = context.protein;
  const vegetables = freshSideBundle(context.recipe) || vegetableBundle(context.recipe, 'the listed salad vegetables', true);
  const filling = protein?.line || vegetables;
  const wrap = findIngredient(context.recipe, /roti|wrap|whole-wheat/i, 'the listed whole-wheat wrap');
  const spread = findIngredient(context.recipe, /hung curd|hummus|\byogurt\b|\bcurd\b|chutney|sauce/i, null);
  const steps = [
    `Warm ${wrap} on a dry tawa for 20–30 seconds per side so it bends without cracking.`,
  ];

  if (protein?.kind === 'chicken') {
    steps.push(
      /\b(?:cooked|grilled)\b/i.test(protein.line)
        ? `Warm ${protein.line} in a dry pan for 2 minutes until hot throughout, then slice it thinly; it is already cooked.`
        : `Cook ${protein.line} over medium heat until the thickest part reaches 74°C / 165°F, then slice it thinly.`
    );
  } else if (protein?.kind === 'eggs') {
    steps.push(
      /\b(?:bhurji|cooked)\b/i.test(protein.line)
        ? `Warm ${protein.line} in a non-stick pan for 1 minute; it is already cooked.`
        : `Cook ${protein.line} in a non-stick pan until fully set with no liquid egg remaining, then break it into small pieces.`
    );
  } else if (protein?.kind === 'paneer' || protein?.kind === 'tofu') {
    steps.push(`Sear ${protein.line} for 1–2 minutes per side until lightly browned, keeping the pieces intact.`);
  } else {
    steps.push(`Cook ${vegetables} over medium-high heat for 3–4 minutes until tender but still crisp.`);
  }

  steps.push(
    spread
      ? `Spread ${spread} in a thin layer, arrange ${filling} and ${vegetables} down the centre, fold the sides in, and roll tightly.`
      : `Arrange ${filling} and ${vegetables} down the centre, fold the sides in, and roll tightly; the listed ingredients need no mayonnaise or unlisted spread.`
  );
  steps.push(`Toast the seam-side down for 1 minute, cut once, and serve the exact ${context.recipe.portionSize || 'wrap'} immediately without mayonnaise.`);
  return steps;
}

function bowlOrStirFrySteps(context) {
  const protein = context.protein;
  const vegetables = vegetableBundle(context.recipe);
  const steps = [
    ...grainSideSteps(context),
    `Cut ${vegetables} into even pieces. Heat ${oilAmount(context.recipe)} over medium-high heat and stir-fry them 4–5 minutes until bright and crisp-tender.`,
  ];

  if (protein?.kind === 'chicken') {
    steps.push(`Add ${protein.line} and cook 6–8 minutes, stirring, until the thickest piece reaches 74°C / 165°F.`);
  } else if (protein?.kind === 'fish') {
    steps.push(`Cook ${protein.line} separately over medium heat until the thickest part reaches 63°C / 145°F and flakes, then fold it through gently.`);
  } else if (protein?.kind === 'paneer' || protein?.kind === 'tofu') {
    steps.push(`Sear ${protein.line} for 1–2 minutes per side, then fold it through the vegetables without crushing the cubes.`);
  } else if (context.pulse) {
    steps.push(pulseReadyStep(context, context.pulse));
  }

  steps.push(`Season with the recipe's listed lemon, herbs, and spices, then combine with the grain only at serving so it stays fluffy.`);
  steps.push(`Serve the exact ${context.recipe.portionSize || 'bowl'} while the vegetables are still crisp.`);
  return steps;
}

function pulsePlateSteps(context) {
  const pulse = context.pulse;
  return [
    ...grainSideSteps(context),
    pulseReadyStep(context, pulse),
    `Heat ${oilAmount(context.recipe)} over medium heat, cook the listed onion, tomato, and ${seasoningPhrase(context)} until thick, then simmer the pulse in the masala for 5 minutes.`,
    `Finish with the listed coriander or lemon and serve the exact ${context.recipe.portionSize || 'plate'} with the measured grain; the pulse should be tender and coated, not dry.`,
  ];
}

function genericMealSteps(context) {
  const primary = vegetableContext(context);
  return [
    ...grainSideSteps(context),
    `Prepare ${primary} and the recipe's listed protein or pulse in even pieces so they cook at the same rate.`,
    `Heat ${oilAmount(context.recipe)} over medium heat, cook the listed aromatics and ${seasoningPhrase(context)} for 1 minute, then add the prepared ingredients with 60 ml water.`,
    `Cover and cook until tender, uncover to reduce the liquid until it coats the ingredients, and finish with the listed herbs or lemon.`,
    `Serve the exact ${context.recipe.portionSize || 'portion'} with its measured side; keep the components separate enough to see their textures.`,
  ];
}

function minutesIn(value) {
  const match = String(value || '').match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function credibleTiming(recipe, context) {
  const currentPrep = minutesIn(recipe.prepTime);
  const currentCook = minutesIn(recipe.cookTime);
  let prep = currentPrep;
  let cook = currentCook;

  if (recipe.mealType === 'Biryani') {
    if (['brown-rice', 'jeera-brown-rice', 'red-rice', 'basmati-or-brown'].includes(context.grain.kind)) {
      // The soak can happen while vegetables are cut and protein is seasoned;
      // the par-cook and longer dum still need a realistic active cook window.
      prep = Math.max(prep, 30);
      cook = Math.max(cook, 45);
    } else if (['foxtail-millet', 'barnyard-millet', 'little-millet', 'millet'].includes(context.grain.kind)) {
      prep = Math.max(prep, 20);
      cook = Math.max(cook, 30);
    } else if (context.grain.kind === 'quinoa') {
      prep = Math.max(prep, 20);
      cook = Math.max(cook, 28);
    } else {
      prep = Math.max(prep, 20);
      cook = Math.max(cook, 35);
    }
  } else if (['brown-rice', 'jeera-brown-rice'].includes(context.grain.kind)) {
    cook = Math.max(cook, 30);
  } else if (context.grain.kind === 'red-rice') {
    cook = Math.max(cook, 32);
  }

  if (prep === currentPrep && cook === currentCook) return {};
  return {
    prepTime: `${prep} min`,
    cookTime: cook > 0 ? `${cook} min` : 'No cooking',
    totalTime: `${prep + cook} min`,
  };
}

function makeContext(recipe) {
  const context = { recipe, text: sourceText(recipe) };
  context.grain = grainContext(recipe);
  context.pulse = pulseContext(recipe);
  context.protein = proteinContext(recipe);
  return context;
}

/**
 * Replace sparse Lunch, Dinner, and Biryani methods with sequential,
 * ingredient-aware cooking directions. Recipes outside those meal types are
 * returned by reference so their existing content is untouched.
 */
export function detailMeal(recipe) {
  if (!recipe || !DETAILED_MEAL_TYPES.has(recipe.mealType)) return recipe;

  const context = makeContext(recipe);
  const title = normalize(recipe.title);
  let steps;

  if (recipe.mealType === 'Biryani') {
    steps = biryaniSteps(context);
  } else if (/soup/.test(title)) {
    steps = soupSteps(context);
  } else if (/salad/.test(title)) {
    steps = saladSteps(context);
  } else if (/wrap/.test(title)) {
    steps = wrapSteps(context);
  } else if (/khichdi/.test(title)) {
    steps = khichdiSteps(context);
  } else if (/sambar|rasam|kootu|avial|poriyal/.test(title)) {
    steps = southIndianPlateSteps(context);
  } else if (/\bdal\b/.test(title)) {
    steps = dalPlateSteps(context);
  } else if (/bhindi|baingan|lauki|tinda|cabbage|cauliflower|beans poriyal|carrot peas|karela|pumpkin|ridge gourd|broccoli|zucchini|aloo gobi|palak corn|methi sabzi|capsicum|mushroom masala|baby corn|sprouts curry|soyabean|torai|chayote|beetroot sabzi|vegetable curry/.test(title)) {
    steps = sabziSteps(context);
  } else if (/bowl|stir fry/.test(title)) {
    steps = bowlOrStirFrySteps(context);
  } else if (context.protein) {
    steps = proteinMealSteps(context);
  } else if (context.pulse) {
    steps = pulsePlateSteps(context);
  } else {
    steps = genericMealSteps(context);
  }

  return {
    ...recipe,
    ...credibleTiming(recipe, context),
    instructions: numberedSteps(steps),
  };
}
