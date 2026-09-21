import assert from 'node:assert/strict';
import test from 'node:test';
import { scaleIngredientLine } from './recipeNutrition.js';

test('scales an ingredient amount and its parenthetical weight equivalent', () => {
  assert.equal(scaleIngredientLine('1 medium ripe banana (120 g)', 2), '2 medium ripe banana (240 g)');
  assert.equal(scaleIngredientLine('1 tbsp oil (5 ml)', 1.5), '1.5 tbsp oil (7.5 ml)');
});

test('scales parenthetical cup equivalents even when the line starts with a weight', () => {
  assert.equal(scaleIngredientLine('150 g ripe mango cubes (1 cup)', 0.5), '75 g ripe mango cubes (0.5 cup)');
});

test('scales leading and parenthetical quantity ranges', () => {
  assert.equal(scaleIngredientLine('2–3 ice cubes', 2), '4–6 ice cubes');
  assert.equal(scaleIngredientLine('50–60 ml water', 2), '100–120 ml water');
  assert.equal(scaleIngredientLine('2 dates (20–24 g)', 2), '4 dates (40–48 g)');
});

test('scales recognised parenthetical count equivalents', () => {
  assert.equal(scaleIngredientLine('60 g banana (1/2 banana)', 2), '120 g banana (1 banana)');
  assert.equal(scaleIngredientLine('60 g whole-wheat flour (2 rotis)', 2), '120 g whole-wheat flour (4 rotis)');
  assert.equal(scaleIngredientLine('60 g prepared idli (2 small idlis)', 2), '120 g prepared idli (4 small idlis)');
  assert.equal(scaleIngredientLine('4 whole spices (1 bay leaf, 2 cloves, 1 cardamom)', 2), '8 whole spices (2 bay leaf, 4 cloves, 2 cardamom)');
});

test('does not scale physical dimensions or timings', () => {
  assert.equal(scaleIngredientLine('1/2-inch piece ginger (5 g)', 2), '1/2-inch piece ginger (10 g)');
  assert.equal(scaleIngredientLine('10 minutes, if needed', 2), '10 minutes, if needed');
  assert.equal(scaleIngredientLine('ginger (1 cm pieces)', 2), 'ginger (1 cm pieces)');
  assert.equal(scaleIngredientLine('chia seeds (soaked10minutes)', 2), 'chia seeds (soaked10minutes)');
});
