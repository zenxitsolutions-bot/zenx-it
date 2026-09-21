# Recipe detail maintenance

The healthy Indian catalog is enriched by meal-specific editorial modules in
`server/src/data/recipeDetails/`. The public recipe schema remains unchanged.
Methods use numbered lines; ingredients use one measured ingredient per line.
Quantities inside methods refer to the recipe's base serving, not an arbitrary
serving-selector value. Preparation and cooking times are estimates.

Keep recipe titles, generated image assignments, dietary labels and existing
nutrition values stable during editorial changes. Nutrition values are existing
catalog estimates; the editorial pass is not a dietitian's nutritional analysis.
Check every method against its complete ingredient list, especially cooked vs.
dry grains, optional ingredients, prepared snack components and side dishes.

## Update an existing database

From `zenx-wellness/server`, use the environment's configured `MYSQL_URL`:

```sh
npm run catalog:details
npm run catalog:details -- --apply
```

The first command previews the change count. Applying updates only the six
editorial fields (ingredients, method, portion, prep/cook/total time) on shared
recipes with exact catalog titles. Company recipes, images, ownership, tags and
nutrition are not changed. Duplicate shared titles cause an error rather than
an ambiguous overwrite. A JSON backup of changed rows is written to a newly
created OS temporary directory and its location is printed before completion.
Database writes are committed together or rolled back together.

Do not use the broader `catalog:sync` solely for editorial updates: that legacy
command also changes visibility and can affect same-title company recipes.

## Verification

```sh
npm run test:unit
```

From the repository root, also run:

```sh
node scripts/check-recipe-images.mjs --complete
```

Recipe safety references for the editorial methods:

- [FDA egg safety](https://www.fda.gov/food/buy-store-serve-safe-food/what-you-need-know-about-egg-safety)
- [FoodSafety.gov minimum internal temperatures](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures)
- [FoodSafety.gov sprout precautions](https://www.foodsafety.gov/people-at-risk/pregnant-women)
