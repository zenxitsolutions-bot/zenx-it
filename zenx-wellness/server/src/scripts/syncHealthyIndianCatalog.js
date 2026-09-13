import { pool } from '../db/pool.js';
import { syncCatalogRecipes, markRecipesSharedByTitles } from '../models/Recipe.js';
import { HEALTHY_INDIAN_RECIPES } from '../data/healthyIndianRecipes.js';

console.log(`[catalog-sync] synchronizing ${HEALTHY_INDIAN_RECIPES.length} shared recipes`);
const { created, updated } = await syncCatalogRecipes(HEALTHY_INDIAN_RECIPES, null);
const shared = await markRecipesSharedByTitles(HEALTHY_INDIAN_RECIPES.map((recipe) => recipe.title));
console.log(`[catalog-sync] created ${created}, updated ${updated}, marked shared ${shared}`);
await pool.end();
