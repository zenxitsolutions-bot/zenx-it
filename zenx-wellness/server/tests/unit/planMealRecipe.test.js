import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeRecipeWithOverride, parseRecipeOverride } from '../../src/lib/planMealRecipe.js';
import { catalogImageFor } from '../../src/data/healthyIndianRecipeContent.js';

describe('plan meal recipe override', () => {
  it('parses JSON and ignores empty values', () => {
    assert.equal(parseRecipeOverride(null), null);
    assert.equal(parseRecipeOverride(''), null);
    const parsed = parseRecipeOverride({ title: 'Light dal', extra: 'drop me' });
    assert.deepEqual(parsed, { title: 'Light dal' });
  });

  it('overlays catalog fields without changing the recipe id or image', () => {
    const catalog = { _id: 'r1', id: 'r1', title: 'Dal Tadka', imageUrl: 'https://example.com/dal.jpg', kcal: 400 };
    const merged = mergeRecipeWithOverride(catalog, { title: 'Dal tadka, less oil', kcal: 320 });
    assert.equal(merged._id, 'r1');
    assert.equal(merged.title, 'Dal tadka, less oil');
    assert.equal(merged.kcal, 320);
    assert.equal(merged.imageUrl, 'https://example.com/dal.jpg');
  });
});

describe('catalog image families', () => {
  it('does not put curry photos on sandwiches or wraps', () => {
    const sandwich = catalogImageFor('Chicken Open Sandwich', 'Snack');
    const wrap = catalogImageFor('Chicken Wrap Dinner', 'Dinner');
    const curry = catalogImageFor('Healthy Chicken Curry', 'Lunch');
    assert.notEqual(sandwich, curry);
    assert.notEqual(wrap, curry);
  });

  it('maps common dish families to matching photos', () => {
    const sandwich = catalogImageFor('Cucumber Mint Sandwich', 'Snack');
    const wrap = catalogImageFor('Healthy Wraps', 'Snack');
    const omelette = catalogImageFor('Masala Omelette with Toast', 'Breakfast');
    const chaas = catalogImageFor('Jeera Chaas', 'Smoothies');
    const paneerBiryani = catalogImageFor('Paneer Biryani', 'Biryani');
    const paneerCurry = catalogImageFor('Paneer Curry', 'Lunch');
    const alooGobi = catalogImageFor('Aloo Gobi Light with Brown Rice', 'Lunch');
    const rajma = catalogImageFor('Rajma with Quinoa', 'Lunch');
    const chole = catalogImageFor('Chole with Brown Rice', 'Lunch');
    const hummus = catalogImageFor('Hummus with Vegetables', 'Snack');
    const sprouts = catalogImageFor('Sprouts Vegetable Salad', 'Dinner');
    const avocadoToast = catalogImageFor('Boiled Eggs with Vegetables', 'Breakfast');
    const yogurt = catalogImageFor('Greek Yogurt with Berries', 'Snack');
    const fishCurry = catalogImageFor('Fish Curry with Millet', 'Lunch');
    const grilledFish = catalogImageFor('Grilled Fish with Vegetables', 'Dinner');
    const eggCurry = catalogImageFor('Egg Curry with Brown Rice', 'Lunch');
    const eggBhurji = catalogImageFor('Egg Bhurji', 'Breakfast');

    assert.match(sandwich, /^\/images\/recipe-catalog\/\d{4}-cucumber-mint-sandwich\.png$/);
    assert.match(wrap, /^\/images\/recipe-catalog\/\d{4}-healthy-wraps\.png$/);
    assert.match(omelette, /^\/images\/recipe-catalog\/\d{4}-masala-omelette-with-toast\.png$/);
    assert.match(chaas, /^\/images\/recipe-catalog\/\d{4}-jeera-chaas\.png$/);
    assert.notEqual(paneerBiryani, paneerCurry);
    assert.match(alooGobi, /aloo-gobi-light-with-brown-rice\.png$/);
    assert.match(rajma, /Rajma/i);
    assert.match(chole, /chole-with-brown-rice\.png$/);
    assert.match(hummus, /Hummus/i);
    assert.match(sprouts, /Sprouts/i);
    assert.match(yogurt, /Yogurt/i);
    assert.notEqual(fishCurry, grilledFish);
    assert.notEqual(eggCurry, eggBhurji);
    assert.doesNotMatch(avocadoToast, /1482049016688/);
  });
});
