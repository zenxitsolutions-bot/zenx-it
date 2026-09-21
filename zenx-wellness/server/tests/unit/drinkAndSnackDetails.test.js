import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HEALTHY_INDIAN_RECIPES } from '../../src/data/healthyIndianRecipes.js';
import { detailDrinkOrSnack } from '../../src/data/recipeDetails/drinksAndSnacks.js';

// Find in the final catalog once integrated; the helper is deliberately exercised
// directly on a minimal input below so category scoping stays covered too.
const find = (title) => HEALTHY_INDIAN_RECIPES.find((recipe) => recipe.title === title);

describe('clear drink and snack methods', () => {
  it('leaves other categories untouched', () => {
    const recipe = { mealType: 'Lunch' };
    assert.equal(detailDrinkOrSnack(recipe), recipe);
  });

  it('gives all 300 drinks and snacks sequential, actionable methods', () => {
    const recipes = HEALTHY_INDIAN_RECIPES.filter((recipe) => ['Smoothies', 'Snack'].includes(recipe.mealType));
    assert.equal(recipes.length, 300);
    for (const recipe of recipes) {
      const detailed = detailDrinkOrSnack(recipe);
      const steps = detailed.instructions.split('\n');
      assert.ok(steps.length >= 3, recipe.title);
      steps.forEach((step, index) => assert.ok(step.startsWith(`${index + 1}. `), recipe.title));
      for (const field of ['title', 'imageUrl', 'kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'dietType']) {
        assert.equal(detailed[field], recipe[field], `${recipe.title}: ${field} changed`);
      }
      assert.match(detailed.portionSize, /1 serving/);
    }
  });

  it('removes dangerous fruit seeds before blending and includes soaking time', () => {
    assert.match(detailDrinkOrSnack(find('Custard Apple Oats Smoothie')).instructions, /remove every black seed/);
    assert.match(detailDrinkOrSnack(find('Lychee Chia Smoothie')).instructions, /brown seed/);
    assert.match(detailDrinkOrSnack(find('Jamun Yogurt Smoothie')).instructions, /discard its hard seed/);
    assert.match(detailDrinkOrSnack(find('Banana Chia Smoothie')).instructions, /30 ml.*10 minutes/);
    assert.equal(detailDrinkOrSnack(find('Banana Chia Smoothie')).totalTime, '20 min');
  });

  it('uses different methods for warmed milk, kokum infusion and raw mango', () => {
    assert.match(detailDrinkOrSnack(find('Turmeric Golden Milk')).instructions, /Warm over low heat/);
    assert.match(detailDrinkOrSnack(find('Kokum Sharbat Light')).instructions, /20 minutes.*softened/);
    assert.match(detailDrinkOrSnack(find('Light Aam Panna')).instructions, /simmer.*10–15 minutes/);
    assert.match(detailDrinkOrSnack(find('Light Aam Panna')).ingredients, /stone removed/);
  });

  it('distinguishes prepared snacks from uncooked dough and firm eggs from runny eggs', () => {
    assert.match(detailDrinkOrSnack(find('Vegetable Momos Steam')).instructions, /reheating-and-serving/);
    assert.match(detailDrinkOrSnack(find('Vegetable Momos Steam')).portionSize, /4/);
    assert.match(detailDrinkOrSnack(find('Steamed Corn on Cob')).instructions, /10–15 minutes/);
    assert.match(detailDrinkOrSnack(find('French Toast Light')).instructions, /71°C/);
    assert.match(detailDrinkOrSnack(find('Egg Bhurji Toast Snack')).ingredients, /raw, beaten/);
    assert.match(detailDrinkOrSnack(find('Chicken Open Sandwich')).ingredients, /fully cooked shredded chicken/);
    assert.match(detailDrinkOrSnack(find('Chicken Open Sandwich')).portionSize, /1 open-faced/);
  });

  it('cooks sprouts and avoids generic roasting for assembled snacks', () => {
    for (const title of ['Sprouts Salad', 'Sprouts Chaat', 'Mixed Sprouts Sundal']) {
      const recipe = detailDrinkOrSnack(find(title));
      assert.match(recipe.instructions, /thoroughly cooked/);
      assert.notEqual(recipe.cookTime, 'No cooking');
    }
    assert.doesNotMatch(detailDrinkOrSnack(find('Roasted Flax Crackers')).instructions, /dry frying pan/);
    assert.match(detailDrinkOrSnack(find('Dahi Puri Light')).instructions, /4 mini puris/);
    assert.match(detailDrinkOrSnack(find('Protein Balls')).instructions, /Both balls together are one serving/);
    assert.match(detailDrinkOrSnack(find('Peanut Chikki Light')).instructions, /harden and snap/);
    assert.match(detailDrinkOrSnack(find('Stewed Apple Cinnamon')).ingredients, /cored and diced/);
  });
});
