import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recommendRecipes } from '../../src/services/recipeRecommend.js';

const recipes = [
  { title: 'Low cal dal', dietType: 'Vegetarian', tags: ['Weight Loss', 'Low Calorie', 'Vegetarian'], kcal: 280, protein: 16, sugar: 3, fat: 5, ingredients: 'moong dal', allergens: 'None' },
  { title: 'Chicken biryani', dietType: 'Non-Vegetarian', tags: ['High Protein', 'Weight Gain'], kcal: 500, protein: 32, sugar: 4, fat: 14, ingredients: 'chicken, rice', allergens: 'None' },
  { title: 'Berry smoothie', dietType: 'Vegetarian', tags: ['Diabetic Friendly', 'High Fiber'], kcal: 190, protein: 8, sugar: 6, fat: 4, ingredients: 'berries, curd', allergens: 'Dairy' },
];

describe('recommendRecipes', () => {
  it('keeps vegetarian recipes for a vegetarian client', () => {
    const out = recommendRecipes(recipes, { dietPreference: 'vegetarian' });
    assert.deepEqual(out.map((r) => r.title), ['Berry smoothie', 'Low cal dal']);
  });

  it('excludes dairy when the client lists a dairy allergy', () => {
    const out = recommendRecipes(recipes, { dietPreference: 'vegetarian', allergies: 'dairy' });
    assert.deepEqual(out.map((r) => r.title), ['Low cal dal']);
  });

  it('ranks weight-loss recipes first for a weight loss program', () => {
    const out = recommendRecipes(recipes, { dietPreference: 'no-preference', programName: 'Weight Loss' });
    assert.equal(out[0].title, 'Low cal dal');
  });
});
