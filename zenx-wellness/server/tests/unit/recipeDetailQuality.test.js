import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HEALTHY_INDIAN_RECIPES } from '../../src/data/healthyIndianRecipes.js';

const recipe = (title) => {
  const found = HEALTHY_INDIAN_RECIPES.find((item) => item.title === title);
  assert.ok(found, `Missing catalog recipe: ${title}`);
  return found;
};

describe('complete catalog recipe clarity', () => {
  it('publishes expanded methods for every recipe, not only representative examples', () => {
    assert.equal(HEALTHY_INDIAN_RECIPES.length, 878);
    for (const item of HEALTHY_INDIAN_RECIPES) {
      const steps = item.instructions.split('\n');
      assert.ok(steps.length >= 3, `${item.title} needs at least preparation, method, and serving steps`);
      assert.ok(item.instructions.length >= 200, `${item.title} still has a sparse method`);
      steps.forEach((step, index) => assert.ok(step.startsWith(`${index + 1}. `), item.title));
      assert.doesNotMatch(item.instructions, /Rinse \d+ cups? cooked/i, `${item.title} treats cooked grain as dry`);
    }
  });

  it('uses the key ingredients that identify core main dishes', () => {
    assert.match(recipe('Palak Paneer').instructions, /spinach|palak/i);
    assert.match(recipe('Chicken Wrap Dinner').instructions, /salad/i);
    assert.doesNotMatch(recipe('Chicken Wrap Dinner').instructions, /Spread the listed hung curd or hummus/i);
    assert.doesNotMatch(recipe('Healthy Chicken Curry').instructions, /Prepare 50 g tomato, chopped as the fresh side/i);
    assert.match(recipe('Vegetable Soup').instructions, /all (?:the )?listed vegetables|beans|cabbage/i);
    assert.match(recipe('Chicken Soup').instructions, /all (?:the )?listed vegetables|beans|celery|cabbage/i);
  });

  it('keeps drink preparation distinct from milk heating and snack reheating', () => {
    assert.match(recipe('Custard Apple Oats Smoothie').instructions, /remove every black seed/);
    assert.match(recipe('Turmeric Golden Milk').instructions, /Warm over low heat/);
    assert.match(recipe('Vegetable Momos Steam').instructions, /reheating-and-serving/);
    assert.match(recipe('Sprouts Salad').instructions, /thoroughly cooked/);
  });
});
