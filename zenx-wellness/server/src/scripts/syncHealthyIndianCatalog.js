import { pool } from '../db/pool.js';
import { findUserByEmail } from '../models/User.js';
import { syncCatalogRecipes, markRecipesSharedByTitles } from '../models/Recipe.js';
import { HEALTHY_INDIAN_RECIPES } from '../data/healthyIndianRecipes.js';

const dietitian = await findUserByEmail('dietitian@nourishly.test');
if (!dietitian) {
  throw new Error('dietitian@nourishly.test not found — run npm run seed first');
}

console.log(`[catalog-sync] ${HEALTHY_INDIAN_RECIPES.length} recipes → ${dietitian.email}`);
const { created, updated } = await syncCatalogRecipes(HEALTHY_INDIAN_RECIPES, dietitian.id);
const shared = await markRecipesSharedByTitles(HEALTHY_INDIAN_RECIPES.map((recipe) => recipe.title));
console.log(`[catalog-sync] created ${created}, updated ${updated}, marked shared ${shared}`);
await pool.end();
