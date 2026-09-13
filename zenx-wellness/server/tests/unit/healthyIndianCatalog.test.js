import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HEALTHY_INDIAN_RECIPES } from '../../src/data/healthyIndianRecipes.js';

describe('healthy Indian catalog size', () => {
  it('has more than 800 unique titled recipes', () => {
    const titles = HEALTHY_INDIAN_RECIPES.map((recipe) => recipe.title);
    assert.equal(new Set(titles).size, titles.length, 'catalog titles must be unique');
    assert.ok(titles.length > 800, `expected >800 recipes, got ${titles.length}`);
  });

  it('does not tag non-vegan dishes as Vegan', () => {
    for (const recipe of HEALTHY_INDIAN_RECIPES) {
      if (recipe.dietType === 'Vegan') continue;
      assert.ok(
        !recipe.tags.includes('Vegan'),
        `${recipe.title} is ${recipe.dietType} but tagged Vegan`
      );
    }
  });

  it('gives every recipe ingredients, numbered steps, and an image', () => {
    for (const recipe of HEALTHY_INDIAN_RECIPES) {
      assert.ok(recipe.title, 'missing title');
      assert.ok(recipe.ingredients?.trim(), `${recipe.title} missing ingredients`);
      assert.match(recipe.instructions, /^1\. /m, `${recipe.title} missing numbered steps`);
      assert.ok(/^https?:\/\//.test(recipe.imageUrl), `${recipe.title} missing image`);
      assert.ok(recipe.portionSize, `${recipe.title} missing portion`);
    }
  });

  it('uses measured ingredient lines instead of template placeholders', () => {
    const vague = /as named|Named |named snack|named curry|named fruit|named filling|Nuts or seeds|Dates or jaggery as binder|Measured grain|80–100 g protein/i;
    for (const recipe of HEALTHY_INDIAN_RECIPES) {
      assert.ok(
        !vague.test(recipe.ingredients),
        `${recipe.title} still has a placeholder ingredient: ${recipe.ingredients}`
      );
      assert.ok(
        !vague.test(recipe.portionSize || ''),
        `${recipe.title} still has a placeholder portion: ${recipe.portionSize}`
      );
    }
    const bites = HEALTHY_INDIAN_RECIPES.find((recipe) => recipe.title === 'Almond Date Energy Bites');
    assert.ok(bites, 'Almond Date Energy Bites should exist');
    assert.match(bites.ingredients, /20 g pitted dates/);
    assert.match(bites.ingredients, /15 g almonds/);
    assert.doesNotMatch(bites.ingredients, /Nuts or seeds/i);
  });

  it('uses measured ingredients and clear sequential methods throughout', () => {
    const measurement =
      /\d|\b(one|two|half|quarter|pinch|handful|cup|tsp|tbsp|g|kg|ml|litre|liter)\b/i;
    const vague =
      /\b(as needed|as required|to taste|named|some|few|choice of|optional protein)\b/i;

    for (const recipe of HEALTHY_INDIAN_RECIPES) {
      const ingredients = recipe.ingredients.split(/\r?\n/).filter(Boolean);
      const steps = recipe.instructions.split(/\r?\n/).filter(Boolean);

      assert.ok(ingredients.length >= 1, `${recipe.title} needs at least one ingredient`);
      for (const ingredient of ingredients) {
        assert.match(
          ingredient,
          measurement,
          `${recipe.title} has an unmeasured ingredient: ${ingredient}`
        );
      }

      assert.ok(steps.length >= 2, `${recipe.title} needs at least two clear steps`);
      assert.ok(
        recipe.instructions.length >= 70,
        `${recipe.title} instructions are too brief to be understandable`
      );
      steps.forEach((step, index) => {
        assert.ok(
          step.startsWith(`${index + 1}. `),
          `${recipe.title} has non-sequential step ${index + 1}: ${step}`
        );
      });
      assert.doesNotMatch(
        `${recipe.ingredients}\n${recipe.instructions}`,
        vague,
        `${recipe.title} contains vague recipe wording`
      );
    }
  });

  it('keeps preparation light and nutrition values within catalog bounds', () => {
    for (const recipe of HEALTHY_INDIAN_RECIPES) {
      const positiveDeepFry = recipe.instructions
        .split(/[.\n]/)
        .filter((sentence) => /deep[- ]?fr/i.test(sentence))
        .filter((sentence) => !/\b(do not|don't|never|not|without|instead of)\b/i.test(sentence));
      assert.deepEqual(
        positiveDeepFry,
        [],
        `${recipe.title} instructs deep frying: ${positiveDeepFry.join('; ')}`
      );
      assert.doesNotMatch(
        recipe.ingredients,
        /\b(?:[2-9]|\d{2,})\s*tbsp\s+(?:of\s+)?(?:oil|ghee|butter)\b/i,
        `${recipe.title} uses excessive added fat`
      );
      assert.doesNotMatch(
        recipe.ingredients,
        /\b(?:refined|white|caster|granulated)\s+sugar\b/i,
        `${recipe.title} uses refined added sugar`
      );

      assert.ok(recipe.kcal >= 50 && recipe.kcal <= 800, `${recipe.title} kcal out of range`);
      assert.ok(recipe.protein >= 0 && recipe.protein <= 80, `${recipe.title} protein out of range`);
      assert.ok(recipe.carbs >= 0 && recipe.carbs <= 120, `${recipe.title} carbs out of range`);
      assert.ok(recipe.fat >= 0 && recipe.fat <= 45, `${recipe.title} fat out of range`);
      assert.ok(recipe.fiber >= 0 && recipe.fiber <= 35, `${recipe.title} fiber out of range`);
      assert.ok(recipe.sugar >= 0 && recipe.sugar <= 35, `${recipe.title} sugar out of range`);
    }
  });

  it('keeps vegan and vegetarian ingredients consistent with diet labels', () => {
    const animalIngredient =
      /(^|\s)(yogurt|curd|paneer|cheese|ghee|egg|eggs|chicken|fish|prawn|feta|low-fat milk|toned milk|whey)(\s|,|$)/i;
    const meatOrEgg = /(^|\s)(egg|eggs|chicken|fish|prawn)(\s|,|$)/i;

    for (const recipe of HEALTHY_INDIAN_RECIPES) {
      if (recipe.dietType === 'Vegan') {
        assert.doesNotMatch(
          recipe.ingredients,
          animalIngredient,
          `${recipe.title} is Vegan but lists an animal-derived ingredient`
        );
      }
      if (recipe.dietType === 'Vegetarian') {
        assert.doesNotMatch(
          recipe.ingredients,
          meatOrEgg,
          `${recipe.title} is Vegetarian but lists meat or egg`
        );
      }
    }
  });
});
