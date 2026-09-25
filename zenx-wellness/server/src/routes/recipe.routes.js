import { Router } from 'express';
import { requirePermission } from '../middleware/permissions.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import {
  listRecipes,
  listRecommendedRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  duplicateRecipe,
  favoriteRecipe,
  unfavoriteRecipe,
  uploadRecipeImage,
  getRecipeImage,
} from '../controllers/recipe.controller.js';
import { createRecipeSchema, updateRecipeSchema } from '../schemas/recipe.schema.js';

export const recipeRouter = Router();
recipeRouter.use(authenticate, blockIfMustChangePassword);

recipeRouter.get('/', requirePermission('recipes.view'), authorize('dietitian', 'admin'), listRecipes);
recipeRouter.get('/recommended', requirePermission('recipes.view'), authorize('dietitian', 'admin'), listRecommendedRecipes);
recipeRouter.get('/:id', requirePermission('recipes.view'), authorize('dietitian', 'admin', 'client'), getRecipe);
recipeRouter.get('/:id/image', requirePermission('recipes.view'), authorize('dietitian', 'admin', 'client'), getRecipeImage);
recipeRouter.post('/', requirePermission('recipes.view', 'recipes.manage'), authorize('dietitian', 'admin'), validate(createRecipeSchema), createRecipe);
recipeRouter.post('/:id/duplicate', requirePermission('recipes.view', 'recipes.manage'), authorize('dietitian', 'admin'), duplicateRecipe);
recipeRouter.post('/:id/favorite', requirePermission('recipes.view'), authorize('dietitian', 'admin'), favoriteRecipe);
recipeRouter.delete('/:id/favorite', requirePermission('recipes.view'), authorize('dietitian', 'admin'), unfavoriteRecipe);
recipeRouter.post('/:id/image', requirePermission('recipes.view', 'recipes.manage'), authorize('dietitian', 'admin'), upload.single('image'), uploadRecipeImage);
recipeRouter.patch('/:id', requirePermission('recipes.view', 'recipes.manage'), authorize('dietitian', 'admin'), validate(updateRecipeSchema), updateRecipe);
recipeRouter.delete('/:id', requirePermission('recipes.view', 'recipes.manage'), authorize('dietitian', 'admin'), deleteRecipe);
