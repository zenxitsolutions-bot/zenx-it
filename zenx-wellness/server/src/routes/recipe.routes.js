import { Router } from 'express';
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

recipeRouter.get('/', authorize('dietitian', 'admin'), listRecipes);
recipeRouter.get('/recommended', authorize('dietitian', 'admin'), listRecommendedRecipes);
recipeRouter.get('/:id', authorize('dietitian', 'admin', 'client'), getRecipe);
recipeRouter.get('/:id/image', authorize('dietitian', 'admin', 'client'), getRecipeImage);
recipeRouter.post('/', authorize('dietitian', 'admin'), validate(createRecipeSchema), createRecipe);
recipeRouter.post('/:id/duplicate', authorize('dietitian', 'admin'), duplicateRecipe);
recipeRouter.post('/:id/favorite', authorize('dietitian', 'admin'), favoriteRecipe);
recipeRouter.delete('/:id/favorite', authorize('dietitian', 'admin'), unfavoriteRecipe);
recipeRouter.post('/:id/image', authorize('dietitian', 'admin'), upload.single('image'), uploadRecipeImage);
recipeRouter.patch('/:id', authorize('dietitian', 'admin'), validate(updateRecipeSchema), updateRecipe);
recipeRouter.delete('/:id', authorize('dietitian', 'admin'), deleteRecipe);
