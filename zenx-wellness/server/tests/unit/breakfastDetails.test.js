import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createHash } from 'node:crypto';
import { HEALTHY_INDIAN_RECIPES } from '../../src/data/healthyIndianRecipes.js';
import { detailBreakfast } from '../../src/data/recipeDetails/breakfast.js';

const recipe = (title) => {
  const result = HEALTHY_INDIAN_RECIPES.find((item) => item.title === title);
  assert.ok(result, title);
  return result;
};

describe('breakfast recipe detail', () => {
  it('preserves every original breakfast ingredient, quantity and portion', () => {
    const breakfasts = HEALTHY_INDIAN_RECIPES.filter((item) => item.mealType === 'Breakfast');
    assert.equal(breakfasts.length, 158);
    const identity = breakfasts.map(({ title, ingredients, portionSize }) => ({ title, ingredients, portionSize }));
    assert.equal(createHash('sha256').update(JSON.stringify(identity)).digest('hex'),
      '4e9b748a0c9bb65de294aa84d8ea29a26d0374263db10d24a4af967f262f7994');
    const other = { title: 'Custom lunch', mealType: 'Lunch', instructions: 'Keep me' };
    assert.equal(detailBreakfast(other), other);
  });

  it('distinguishes prepared idli batter from dry grain', () => {
    assert.doesNotMatch(recipe('Oats Idli').instructions, /dry-roast|Add 100 ml/);
    assert.match(recipe('Rava Idli with Sambar').instructions, /Choose one route/);
    assert.match(recipe('Rava Idli with Sambar').instructions, /without adding water/);
    assert.match(recipe('Ragi Dosa').instructions, /flour|Whisk ragi/);
  });

  it('keeps prepared foods prepared and uses the original plate components', () => {
    assert.match(recipe('Khaman Dhokla Plate').instructions, /prepared khaman/);
    assert.match(recipe('Idiyappam with Vegetable Stew').instructions, /prepared nests/);
    assert.match(recipe('Boiled Eggs with Millet Upma').instructions, /prepared millet upma/);
    assert.match(recipe('Sabudana Khichdi Light').instructions, /already-soaked/);
    assert.match(recipe('Sabudana Khichdi Light').instructions, /roasted peanuts/);
    assert.match(recipe('Pesarattu with Chutney').instructions, /ginger.*green chilli/);
  });

  it('gives missing dough water explicitly and keeps prepared masala separate from salad', () => {
    assert.match(recipe('Palak Paratha').instructions, /45 ml water/);
    assert.match(recipe('Palak Paratha').instructions, /enclose/);
    assert.match(recipe('Akki Roti with Chutney').instructions, /35 ml warm water/);
    for (const title of ['Paneer Bhurji with Phulkas', 'Tofu Bhurji with Phulkas', 'Mushroom Bhurji with Phulkas']) {
      assert.match(recipe(title).instructions, /40 g prepared onion-tomato masala/);
      assert.match(recipe(title).instructions, /salad fresh and separate/);
      assert.doesNotMatch(recipe(title).instructions, /listed cooking fat/);
    }
  });

  it('keeps soft set dosa distinct from crisp thin dosa and explains long soaking', () => {
    assert.match(recipe('Set Dosa with Sambar').instructions, /without spreading it thin/);
    assert.match(recipe('Bajra Porridge').instructions, /additional to the active preparation time/);
    assert.match(recipe('Bajra Porridge').instructions, /until tender/);
  });
});
