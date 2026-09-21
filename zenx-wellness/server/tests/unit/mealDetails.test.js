import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detailMeal } from '../../src/data/recipeDetails/meals.js';

const lunch = (title, ingredients, portionSize = '1 serving') => ({
  title,
  mealType: 'Lunch',
  ingredients,
  portionSize,
  prepTime: '10 min',
  cookTime: '25 min',
  totalTime: '35 min',
  instructions: '1. Existing short method.',
});

describe('detailMeal', () => {
  it('keeps dough water separate from curry water and warms prepared rotis', () => {
    const paneer = detailMeal(lunch('Paneer Curry', '80 g paneer\n40 g onion\n60 g tomato\n1 tsp oil\n80 ml water\n60 g whole-wheat flour (2 rotis)\n40 ml water for dough'));
    assert.match(paneer.instructions, /flour \(2 rotis\) with 40 ml water for dough/);
    assert.match(paneer.instructions, /Add 80 ml water to loosen/);
    const ready = detailMeal(lunch('Chana Masala with Phulkas', '80 g boiled chickpeas\n2 prepared phulkas\n40 g tomato\n1 tsp oil'));
    assert.match(ready.instructions, /prepared bread portion/);
    assert.doesNotMatch(ready.instructions, /knead/i);
  });

  it('keeps cucumber salad out of a hot biryani filling', () => {
    const biryani = detailMeal({ ...lunch('Vegetable Biryani', '50 g basmati rice\n100 g mixed vegetables\n40 g cucumber salad\n1 tsp oil\n1/2 tsp biryani masala'), mealType: 'Biryani' });
    const cooking = biryani.instructions.split('\n').find((line) => /until crisp-tender/.test(line));
    assert.match(cooking, /100 g mixed vegetables/);
    assert.doesNotMatch(cooking, /cucumber/);
  });

  it('recognises fully cooked fish and includes its measured vegetable side', () => {
    const fish = detailMeal({ ...lunch('Grilled Fish with Vegetables', '120 g grilled fish\n150 g steamed vegetables\n1 tsp lemon juice'), mealType: 'Dinner' });
    assert.match(fish.instructions, /already fully cooked/);
    assert.match(fish.instructions, /150 g steamed vegetables/);
    assert.doesNotMatch(fish.instructions, /lightly oiled grill pan/);
  });

  it('leaves recipe types outside Lunch, Dinner, and Biryani untouched', () => {
    const snack = { title: 'Snack', mealType: 'Snack', instructions: '1. Keep this.' };
    assert.equal(detailMeal(snack), snack);
  });

  it('keeps blanched spinach in palak paneer and does not mistake garlic cloves for whole spices', () => {
    const detailed = detailMeal(lunch(
      'Palak Paneer',
      '100 g spinach leaves, blanched\n80 g paneer, cubed\n40 g tomato, chopped\n2 garlic cloves\n1 tsp oil\n60 g whole-wheat flour (2 rotis)\n40 ml water for dough'
    ));

    assert.match(detailed.instructions, /spinach leaves, blanched/i);
    assert.match(detailed.instructions, /blend it to a smooth purée/i);
    assert.doesNotMatch(detailed.instructions, /whole spices/i);
  });

  it('uses a cooked grain as a ready portion instead of rinsing and cooking it again', () => {
    const detailed = detailMeal(lunch(
      'Baingan Bharta with Red Rice',
      '150 g eggplant\n1 cup cooked red rice (50 g dry)\n40 g onion, chopped\n40 g tomato, chopped\n1 tsp oil'
    ));

    assert.match(detailed.instructions, /ready cooked portion/i);
    assert.doesNotMatch(detailed.instructions, /Rinse 1 cup cooked red rice/i);
    assert.match(detailed.instructions, /40 g onion/i);
  });

  it('keeps all vegetable lines in a soup and gives a safe hot-blending option', () => {
    const detailed = detailMeal({
      ...lunch(
        'Vegetable Soup',
        '40 g carrot, diced\n40 g beans, sliced\n40 g cabbage, shredded\n40 g green peas\n20 g onion, chopped\n1 tsp oil\n500 ml water or unsalted vegetable stock\n1 slice whole-wheat toast'
      ),
      mealType: 'Dinner',
    });

    for (const vegetable of ['carrot', 'beans', 'cabbage', 'green peas']) {
      assert.match(detailed.instructions, new RegExp(vegetable, 'i'));
    }
    assert.doesNotMatch(detailed.instructions, /cut 500 ml water/i);
    assert.match(detailed.instructions, /immersion blender|manufacturer/i);
  });

  it('does not invent a wrap spread and retains the listed salad with cooked chicken', () => {
    const detailed = detailMeal({
      ...lunch('Chicken Wrap Dinner', '1 whole-wheat wrap (40 g)\n80 g cooked chicken\n1 cup salad (80 g)', '1 wrap'),
      mealType: 'Dinner',
    });

    assert.match(detailed.instructions, /1 cup salad/i);
    assert.match(detailed.instructions, /already cooked/i);
    assert.doesNotMatch(detailed.instructions, /hung curd|hummus/i);
  });

  it('distinguishes basmati and brown-rice biryani timings and handles hydrated soya chunks', () => {
    const biryani = detailMeal({
      ...lunch(
        'Vegetable Biryani',
        '50 g basmati or brown rice (dry)\n180 g mixed vegetables (carrot, beans, cauliflower, peas)\n1 tsp oil\n1/2 tsp biryani masala\n2 cloves\n1 bay leaf\n5 g mint leaves',
        '1 bowl'
      ),
      mealType: 'Biryani',
      prepTime: '20 min',
      cookTime: '30 min',
      totalTime: '50 min',
    });
    const soya = detailMeal(lunch(
      'Soya Curry with Brown Rice',
      '40 g dry soya chunks, soaked and cooked\n1 cup cooked brown rice (50 g dry)\n40 g onion, chopped\n40 g tomato, chopped\n1 tsp oil'
    ));

    assert.match(biryani.instructions, /For basmati/i);
    assert.match(biryani.instructions, /For brown rice/i);
    assert.match(biryani.cookTime, /45 min/);
    assert.match(soya.instructions, /squeeze out excess water/i);
    assert.doesNotMatch(soya.instructions, /Rinse 1 cup cooked brown rice/i);
  });
});
